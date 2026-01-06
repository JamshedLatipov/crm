import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { EmailMessage, EmailStatus } from '../entities/email-message.entity';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  rejectedRecipients?: string[];
  emailMessageId?: string; // ID записи в базе данных
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
  // Дополнительные поля для сохранения в БД
  campaignId?: string;
  contactId?: string;
  leadId?: string;
  recipientName?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class EmailProviderService {
  private readonly logger = new Logger(EmailProviderService.name);
  private transporter: Transporter | null = null;
  private readonly isEnabled: boolean;

  constructor(
    private configService: ConfigService,
    @InjectRepository(EmailMessage)
    private emailMessageRepository: Repository<EmailMessage>
  ) {
    this.isEnabled = this.configService.get<boolean>('FEATURE_EMAIL_ENABLED', false);
    
    if (this.isEnabled) {
      this.initializeTransporter();
    } else {
      this.logger.warn('Email provider is disabled. Set FEATURE_EMAIL_ENABLED=true to enable.');
    }
  }

  /**
   * Инициализация SMTP транспортера
   */
  private initializeTransporter(): void {
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');

    if (!smtpUser || !smtpPassword) {
      this.logger.warn('SMTP credentials not configured. Email sending will be disabled.');
      return;
    }

    const smtpConfig = {
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false), // true для 465, false для других портов
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      tls: {
        rejectUnauthorized: this.configService.get<boolean>('SMTP_TLS_REJECT_UNAUTHORIZED', true),
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Проверяем подключение при старте
    this.verifyConnection();
  }

  /**
   * Проверка подключения к SMTP серверу
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection verification failed:', error.message);
      return false;
    }
  }

  /**
   * Отправка email
   */
  async sendEmail(options: EmailOptions): Promise<SendEmailResult> {
    // Получаем email адрес получателя
    const recipientEmail = Array.isArray(options.to) ? options.to[0] : options.to;

    // Создаем запись в БД со статусом PENDING
    const emailMessage = this.emailMessageRepository.create({
      email: recipientEmail,
      recipientName: options.recipientName,
      subject: options.subject,
      htmlContent: options.html || '',
      textContent: options.text || '',
      status: EmailStatus.PENDING,
      campaign: options.campaignId ? ({ id: options.campaignId } as any) : null,
      contact: options.contactId ? ({ id: options.contactId } as any) : null,
      lead: options.leadId ? ({ id: options.leadId } as any) : null,
      metadata: options.metadata || {},
      tracking: {
        opens: 0,
        clicks: 0,
        bounces: 0,
      },
    });

    await this.emailMessageRepository.save(emailMessage);
    
    if (!this.isEnabled || !this.transporter) {
      this.logger.warn('Email provider is not enabled or not configured');
      
      // Обновляем статус на FAILED
      emailMessage.status = EmailStatus.FAILED;
      emailMessage.failedAt = new Date();
      emailMessage.metadata = {
        ...emailMessage.metadata,
        error: 'Email provider is not enabled or not configured',
      };
      await this.emailMessageRepository.save(emailMessage);
      
      return {
        success: false,
        error: 'Email provider is not enabled or not configured',
        emailMessageId: emailMessage.id,
      };
    }

    try {
      const defaultFrom = this.configService.get<string>(
        'SMTP_FROM',
        '"CRM System" <noreply@crm.com>'
      );

      const mailOptions: Mail.Options = {
        from: options.from || defaultFrom,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        attachments: options.attachments,
      };

      this.logger.log(`Sending email to ${mailOptions.to}`);

      // Обновляем статус на SENDING
      emailMessage.status = EmailStatus.SENDING;
      emailMessage.queuedAt = new Date();
      await this.emailMessageRepository.save(emailMessage);

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully: ${info.messageId}`);

      // Обновляем статус на SENT
      emailMessage.status = EmailStatus.SENT;
      emailMessage.sentAt = new Date();
      emailMessage.metadata = {
        ...emailMessage.metadata,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      };
      await this.emailMessageRepository.save(emailMessage);

      return {
        success: true,
        messageId: info.messageId,
        rejectedRecipients: info.rejected as string[],
        emailMessageId: emailMessage.id,
      };
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      
      // Обновляем статус на FAILED
      emailMessage.status = EmailStatus.FAILED;
      emailMessage.failedAt = new Date();
      emailMessage.metadata = {
        ...emailMessage.metadata,
        error: error.message,
        stack: error.stack,
      };
      await this.emailMessageRepository.save(emailMessage);
      
      return {
        success: false,
        error: error.message,
        emailMessageId: emailMessage.id,
      };
    }
  }

  /**
   * Отправка email с шаблоном
   */
  async sendTemplatedEmail(
    to: string | string[],
    subject: string,
    template: string,
    variables: Record<string, any>,
    options?: Partial<EmailOptions>
  ): Promise<SendEmailResult> {
    if (!this.isEnabled || !this.transporter) {
      return {
        success: false,
        error: 'Email provider is not enabled or not configured',
      };
    }

    // Рендерим шаблон
    const html = this.renderTemplate(template, variables);
    const text = this.htmlToText(html);

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      ...options,
    });
  }

  /**
   * Массовая отправка email
   */
  async sendBulkEmails(
    emails: Array<{
      to: string;
      subject: string;
      html: string;
      variables?: Record<string, any>;
    }>,
    delayMs: number = 100
  ): Promise<SendEmailResult[]> {
    if (!this.isEnabled || !this.transporter) {
      return emails.map(() => ({
        success: false,
        error: 'Email provider is not enabled or not configured',
      }));
    }

    const results: SendEmailResult[] = [];

    for (const email of emails) {
      const html = email.variables
        ? this.renderTemplate(email.html, email.variables)
        : email.html;

      const result = await this.sendEmail({
        to: email.to,
        subject: email.subject,
        html,
      });

      results.push(result);

      // Задержка между отправками
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Рендеринг шаблона с переменными
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    // Подставляем переменные в формате {{variable}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      rendered = rendered.replace(regex, value?.toString() || '');
    }

    return rendered;
  }

  /**
   * Простое преобразование HTML в текст
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, '')
      .replace(/<script[^>]*>.*<\/script>/gm, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Валидация email адреса
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Отправка email с вложениями
   */
  async sendEmailWithAttachments(
    to: string | string[],
    subject: string,
    html: string,
    attachments: Array<{
      filename: string;
      content?: string | Buffer;
      path?: string;
    }>
  ): Promise<SendEmailResult> {
    return this.sendEmail({
      to,
      subject,
      html,
      attachments,
    });
  }

  /**
   * Отправка транзакционного email
   */
  async sendTransactionalEmail(
    to: string,
    subject: string,
    html: string,
    priority: 'high' | 'normal' | 'low' = 'high'
  ): Promise<SendEmailResult> {
    return this.sendEmail({
      to,
      subject,
      html,
    });
  }
}
