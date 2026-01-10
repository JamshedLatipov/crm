import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from '../entities/email-template.entity';

export interface CreateEmailTemplateDto {
  name: string;
  description?: string;
  subject: string;
  preheader?: string;
  htmlContent: string;
  textContent?: string;
  cssStyles?: string;
  category?: 'marketing' | 'transactional' | 'notification' | 'system';
  variables?: Record<string, string>;
}

export interface UpdateEmailTemplateDto {
  name?: string;
  description?: string;
  subject?: string;
  preheader?: string;
  htmlContent?: string;
  textContent?: string;
  cssStyles?: string;
  category?: 'marketing' | 'transactional' | 'notification' | 'system';
  variables?: Record<string, string>;
  isActive?: boolean;
}

@Injectable()
export class EmailTemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private readonly emailTemplateRepository: Repository<EmailTemplate>,
  ) {}

  /**
   * Создать шаблон email
   */
  async create(dto: CreateEmailTemplateDto, userId: string): Promise<EmailTemplate> {
    // Извлечь переменные из HTML
    const extractedVariables = this.extractVariables(dto.htmlContent);
    
    const template = this.emailTemplateRepository.create({
      name: dto.name,
      description: dto.description,
      subject: dto.subject,
      preheader: dto.preheader,
      htmlContent: dto.htmlContent,
      textContent: dto.textContent,
      cssStyles: dto.cssStyles,
      category: dto.category as any,
      createdBy: { id: userId } as any,
      variables: dto.variables || extractedVariables,
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalBounced: 0,
      totalUnsubscribed: 0,
    });

    return this.emailTemplateRepository.save(template);
  }

  /**
   * Получить все шаблоны
   */
  async findAll(
    page: number = 1,
    limit: number = 20,
    category?: string,
    isActive?: boolean
  ): Promise<{ data: EmailTemplate[]; total: number; page: number; limit: number }> {
    const query = this.emailTemplateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.createdBy', 'createdBy');

    if (category) {
      query.andWhere('template.category = :category', { category });
    }

    if (isActive !== undefined) {
      query.andWhere('template.isActive = :isActive', { isActive });
    }

    query
      .orderBy('template.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Получить шаблон по ID
   */
  async findOne(id: string): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!template) {
      throw new NotFoundException(`Email template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Обновить шаблон
   */
  async update(id: string, dto: UpdateEmailTemplateDto): Promise<EmailTemplate> {
    const template = await this.findOne(id);

    // Если обновляется HTML, переизвлечь переменные
    if (dto.htmlContent) {
      const extractedVariables = this.extractVariables(dto.htmlContent);
      dto.variables = dto.variables || extractedVariables;
    }

    Object.assign(template, dto);
    template.updatedAt = new Date();

    return this.emailTemplateRepository.save(template);
  }

  /**
   * Удалить шаблон (мягкое удаление)
   */
  async delete(id: string): Promise<void> {
    const template = await this.findOne(id);
    template.isActive = false;
    await this.emailTemplateRepository.save(template);
  }

  /**
   * Дублировать шаблон
   */
  async duplicate(id: string, userId: string): Promise<EmailTemplate> {
    const original = await this.findOne(id);

    const duplicate = this.emailTemplateRepository.create({
      name: `${original.name} (копия)`,
      description: original.description,
      subject: original.subject,
      preheader: original.preheader,
      htmlContent: original.htmlContent,
      textContent: original.textContent,
      cssStyles: original.cssStyles,
      category: original.category,
      variables: original.variables,
      createdBy: { id: userId } as any,
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalBounced: 0,
      totalUnsubscribed: 0,
    });

    return this.emailTemplateRepository.save(duplicate);
  }

  /**
   * Рендеринг шаблона с переменными
   */
  renderTemplate(
    template: EmailTemplate,
    variables: Record<string, any>
  ): { subject: string; html: string; text: string } {
    let subject = template.subject;
    let html = template.htmlContent;
    let text = template.textContent || '';

    // Замена переменных в subject
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      subject = subject.replace(regex, String(variables[key] || ''));
      html = html.replace(regex, String(variables[key] || ''));
      text = text.replace(regex, String(variables[key] || ''));
    });

    return { subject, html, text };
  }

  /**
   * Валидация HTML шаблона
   */
  validateTemplate(htmlContent: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Проверка на наличие основных тегов
    if (!htmlContent.includes('<html') || !htmlContent.includes('</html>')) {
      warnings.push('HTML template should include <html> tags');
    }

    if (!htmlContent.includes('<body') || !htmlContent.includes('</body>')) {
      warnings.push('HTML template should include <body> tags');
    }

    // Проверка на неправильные переменные
    const variablePattern = /{{[^}]*}}/g;
    const variables = htmlContent.match(variablePattern) || [];
    
    variables.forEach(variable => {
      // Проверка на правильный формат {{variable}}
      if (!variable.match(/^{{\s*[\w]+\s*}}$/)) {
        errors.push(`Invalid variable format: ${variable}`);
      }
    });

    // Проверка на потенциально опасный контент
    if (htmlContent.includes('<script')) {
      errors.push('Script tags are not allowed in email templates');
    }

    if (htmlContent.includes('javascript:')) {
      errors.push('JavaScript URLs are not allowed in email templates');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Извлечь переменные из HTML
   */
  extractVariables(htmlContent: string): Record<string, string> {
    const variables: Record<string, string> = {};
    const variablePattern = /{{\s*([\w]+)\s*}}/g;
    let match;

    while ((match = variablePattern.exec(htmlContent)) !== null) {
      const varName = match[1];
      if (!variables[varName]) {
        variables[varName] = ''; // Описание можно будет добавить вручную
      }
    }

    return variables;
  }

  /**
   * Получить статистику по шаблону
   */
  async getStatistics(id: string): Promise<{
    template: EmailTemplate;
    stats: {
      totalSent: number;
      totalDelivered: number;
      totalOpened: number;
      totalClicked: number;
      totalBounced: number;
      totalUnsubscribed: number;
      deliveryRate: number;
      openRate: number;
      clickRate: number;
      bounceRate: number;
      unsubscribeRate: number;
    };
  }> {
    const template = await this.findOne(id);

    const deliveryRate = template.totalSent > 0
      ? (template.totalDelivered / template.totalSent) * 100
      : 0;

    const openRate = template.totalDelivered > 0
      ? (template.totalOpened / template.totalDelivered) * 100
      : 0;

    const clickRate = template.totalOpened > 0
      ? (template.totalClicked / template.totalOpened) * 100
      : 0;

    const bounceRate = template.totalSent > 0
      ? (template.totalBounced / template.totalSent) * 100
      : 0;

    const unsubscribeRate = template.totalDelivered > 0
      ? (template.totalUnsubscribed / template.totalDelivered) * 100
      : 0;

    return {
      template,
      stats: {
        totalSent: template.totalSent,
        totalDelivered: template.totalDelivered,
        totalOpened: template.totalOpened,
        totalClicked: template.totalClicked,
        totalBounced: template.totalBounced,
        totalUnsubscribed: template.totalUnsubscribed,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
        unsubscribeRate: Math.round(unsubscribeRate * 100) / 100,
      },
    };
  }

  /**
   * Обновить статистику шаблона
   */
  async updateStatistics(
    id: string,
    stats: {
      sent?: number;
      delivered?: number;
      opened?: number;
      clicked?: number;
      bounced?: number;
      unsubscribed?: number;
    }
  ): Promise<void> {
    const template = await this.findOne(id);

    if (stats.sent) template.totalSent += stats.sent;
    if (stats.delivered) template.totalDelivered += stats.delivered;
    if (stats.opened) template.totalOpened += stats.opened;
    if (stats.clicked) template.totalClicked += stats.clicked;
    if (stats.bounced) template.totalBounced += stats.bounced;
    if (stats.unsubscribed) template.totalUnsubscribed += stats.unsubscribed;

    await this.emailTemplateRepository.save(template);
  }

  /**
   * Увеличить счётчик использования шаблона
   */
  async incrementUsageCount(id: string): Promise<void> {
    await this.emailTemplateRepository.increment({ id }, 'totalSent', 1);
  }
}
