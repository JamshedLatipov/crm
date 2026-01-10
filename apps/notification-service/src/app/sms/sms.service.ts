import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SmsMessage, MessageStatus, MessageDirection } from './entities/sms-message.entity';
import { SmsTemplate, TemplateCategory } from './entities/sms-template.entity';

export interface SendSmsDto {
  phoneNumber: string;
  content?: string;
  templateId?: string;
  variables?: Record<string, any>;
  contactId?: number;
  leadId?: number;
  sender?: string;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  content: string;
  category?: TemplateCategory;
  variables?: string[];
  createdById?: number;
}

export type UpdateTemplateDto = Partial<CreateTemplateDto>;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @InjectRepository(SmsMessage)
    private readonly messageRepo: Repository<SmsMessage>,
    @InjectRepository(SmsTemplate)
    private readonly templateRepo: Repository<SmsTemplate>,
  ) {}

  // Message operations
  async sendSms(dto: SendSmsDto): Promise<SmsMessage> {
    let content = dto.content;

    if (dto.templateId) {
      const template = await this.templateRepo.findOne({ where: { id: dto.templateId } });
      if (!template) throw new NotFoundException('Template not found');
      if (!template.isActive) throw new BadRequestException('Template is not active');
      
      content = this.applyVariables(template.content, dto.variables || {});
      
      // Update template usage
      template.usageCount += 1;
      await this.templateRepo.save(template);
    }

    if (!content) {
      throw new BadRequestException('Content or templateId is required');
    }

    const message = this.messageRepo.create({
      phoneNumber: dto.phoneNumber,
      content,
      templateId: dto.templateId,
      contactId: dto.contactId,
      leadId: dto.leadId,
      sender: dto.sender,
      status: MessageStatus.QUEUED,
      direction: MessageDirection.OUTBOUND,
      segments: this.calculateSegments(content),
      metadata: { variables: dto.variables },
    });

    const saved = await this.messageRepo.save(message);

    // Here you would integrate with actual SMS provider
    // For now, we'll simulate sending
    this.processSend(saved.id);

    return saved;
  }

  async sendBulk(recipients: SendSmsDto[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const dto of recipients) {
      try {
        await this.sendSms(dto);
        sent++;
      } catch (error) {
        this.logger.error(`Failed to send SMS to ${dto.phoneNumber}: ${(error as Error).message}`);
        failed++;
      }
    }

    return { sent, failed };
  }

  async getMessage(id: string): Promise<SmsMessage> {
    const message = await this.messageRepo.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    return message;
  }

  async getMessages(filters?: {
    status?: MessageStatus;
    phoneNumber?: string;
    contactId?: number;
    leadId?: number;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ messages: SmsMessage[]; total: number }> {
    const qb = this.messageRepo.createQueryBuilder('msg');

    if (filters?.status) {
      qb.andWhere('msg.status = :status', { status: filters.status });
    }
    if (filters?.phoneNumber) {
      qb.andWhere('msg.phoneNumber = :phoneNumber', { phoneNumber: filters.phoneNumber });
    }
    if (filters?.contactId) {
      qb.andWhere('msg.contactId = :contactId', { contactId: filters.contactId });
    }
    if (filters?.leadId) {
      qb.andWhere('msg.leadId = :leadId', { leadId: filters.leadId });
    }
    if (filters?.from && filters?.to) {
      qb.andWhere('msg.createdAt BETWEEN :from AND :to', { from: filters.from, to: filters.to });
    }

    const total = await qb.getCount();

    qb.orderBy('msg.createdAt', 'DESC')
      .take(filters?.limit || 50)
      .skip(filters?.offset || 0);

    const messages = await qb.getMany();
    return { messages, total };
  }

  async getStats(from?: Date, to?: Date): Promise<any> {
    const dateFilter = from && to ? { createdAt: Between(from, to) } : {};

    const [total, sent, delivered, failed] = await Promise.all([
      this.messageRepo.count({ where: dateFilter }),
      this.messageRepo.count({ where: { ...dateFilter, status: MessageStatus.SENT } }),
      this.messageRepo.count({ where: { ...dateFilter, status: MessageStatus.DELIVERED } }),
      this.messageRepo.count({ where: { ...dateFilter, status: MessageStatus.FAILED } }),
    ]);

    return {
      total,
      sent,
      delivered,
      failed,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(2) : 0,
      failureRate: total > 0 ? ((failed / total) * 100).toFixed(2) : 0,
    };
  }

  // Template operations
  async createTemplate(dto: CreateTemplateDto): Promise<SmsTemplate> {
    const template = this.templateRepo.create({
      ...dto,
      variables: dto.variables || this.extractVariables(dto.content),
    });
    return this.templateRepo.save(template);
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto): Promise<SmsTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    
    Object.assign(template, dto);
    if (dto.content) {
      template.variables = dto.variables || this.extractVariables(dto.content);
    }
    
    return this.templateRepo.save(template);
  }

  async deleteTemplate(id: string): Promise<{ deleted: boolean }> {
    const result = await this.templateRepo.delete(id);
    return { deleted: (result.affected ?? 0) > 0 };
  }

  async getTemplate(id: string): Promise<SmsTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async getTemplates(category?: TemplateCategory, activeOnly = false): Promise<SmsTemplate[]> {
    const where: any = {};
    if (category) where.category = category;
    if (activeOnly) where.isActive = true;
    return this.templateRepo.find({ where, order: { name: 'ASC' } });
  }

  async toggleTemplate(id: string): Promise<SmsTemplate> {
    const template = await this.getTemplate(id);
    template.isActive = !template.isActive;
    return this.templateRepo.save(template);
  }

  async previewTemplate(id: string, variables: Record<string, any>): Promise<string> {
    const template = await this.getTemplate(id);
    return this.applyVariables(template.content, variables);
  }

  // Helper methods
  private applyVariables(content: string, variables: Record<string, any>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
    }
    return result;
  }

  private extractVariables(content: string): string[] {
    const matches = content.match(/\{\{\s*(\w+)\s*\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{\s*|\s*\}\}/g, '')))];
  }

  private calculateSegments(content: string): number {
    // GSM-7 encoding: 160 chars per segment, or 153 if concatenated
    // Unicode: 70 chars per segment, or 67 if concatenated
    const hasUnicode = /[^\x00-\x7F]/.test(content);
    const singleSegmentLimit = hasUnicode ? 70 : 160;
    const multiSegmentLimit = hasUnicode ? 67 : 153;

    if (content.length <= singleSegmentLimit) return 1;
    return Math.ceil(content.length / multiSegmentLimit);
  }

  private async processSend(messageId: string): Promise<void> {
    // Simulate async processing
    setTimeout(async () => {
      try {
        const message = await this.messageRepo.findOne({ where: { id: messageId } });
        if (!message) return;

        // Simulate sending
        message.status = MessageStatus.SENT;
        message.sentAt = new Date();
        await this.messageRepo.save(message);

        // Simulate delivery after 2 seconds
        setTimeout(async () => {
          const msg = await this.messageRepo.findOne({ where: { id: messageId } });
          if (msg && msg.status === MessageStatus.SENT) {
            msg.status = MessageStatus.DELIVERED;
            msg.deliveredAt = new Date();
            await this.messageRepo.save(msg);
          }
        }, 2000);
      } catch (error) {
        this.logger.error(`Failed to process SMS ${messageId}: ${(error as Error).message}`);
      }
    }, 100);
  }
}
