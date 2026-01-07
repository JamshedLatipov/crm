import { Injectable, NotFoundException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessageCampaign, MessageChannelType } from '../entities/message-campaign.entity';
import { CampaignStatus, CampaignType } from '../entities/sms-campaign.entity';
import { SmsMessage, MessageStatus } from '../entities/sms-message.entity';
import { WhatsAppMessage, WhatsAppMessageStatus } from '../entities/whatsapp-message.entity';
import { TelegramMessage, TelegramMessageStatus } from '../entities/telegram-message.entity';
import { CreateCampaignDto, UpdateCampaignDto } from '../dto/campaign.dto';
import { SmsTemplateService } from './sms-template.service';
import { EmailTemplateService } from './email-template.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { TelegramTemplateService } from './telegram-template.service';
import { SmsSegmentService } from './sms-segment.service';
import { User } from '../../user/user.entity';
import { MessageChannel, MessageQueueService } from './message-queue.service';

/**
 * Unified service for managing campaigns across all channels (SMS, WhatsApp, Telegram, Email)
 * Uses MessageCampaign entity and channel-specific message entities
 */
@Injectable()
export class MessageCampaignService {
  private readonly logger = new Logger(MessageCampaignService.name);

  constructor(
    @InjectRepository(MessageCampaign)
    private campaignRepository: Repository<MessageCampaign>,
    
    // Channel-specific message repositories
    @InjectRepository(SmsMessage)
    private smsMessageRepository: Repository<SmsMessage>,
    @InjectRepository(WhatsAppMessage)
    private whatsappMessageRepository: Repository<WhatsAppMessage>,
    @InjectRepository(TelegramMessage)
    private telegramMessageRepository: Repository<TelegramMessage>,
    
    // Template services
    private smsTemplateService: SmsTemplateService,
    private emailTemplateService: EmailTemplateService,
    private whatsappTemplateService: WhatsAppTemplateService,
    private telegramTemplateService: TelegramTemplateService,
    
    // Other services
    private segmentService: SmsSegmentService,
    @Optional() private messageQueueService?: MessageQueueService,
  ) {}

  /**
   * Get the correct message repository based on channel
   */
  private getMessageRepository(channel: MessageChannelType): Repository<any> {
    switch (channel) {
      case MessageChannelType.SMS:
        return this.smsMessageRepository;
      case MessageChannelType.WHATSAPP:
        return this.whatsappMessageRepository;
      case MessageChannelType.TELEGRAM:
        return this.telegramMessageRepository;
      default:
        throw new BadRequestException(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Get the correct message status enum based on channel
   */
  private getMessageStatusEnum(channel: MessageChannelType) {
    switch (channel) {
      case MessageChannelType.SMS:
        return MessageStatus;
      case MessageChannelType.WHATSAPP:
        return WhatsAppMessageStatus;
      case MessageChannelType.TELEGRAM:
        return TelegramMessageStatus;
      default:
        return MessageStatus;
    }
  }

  /**
   * Создание новой кампании
   */
  async create(createDto: CreateCampaignDto, user: User): Promise<MessageCampaign> {
    // Определяем канал
    const channel = createDto.channel || MessageChannel.SMS;
    const channelType = this.mapChannelToChannelType(channel);
    
    // Проверяем существование шаблона в зависимости от канала
    let template;
    switch (channel) {
      case MessageChannel.SMS:
        template = await this.smsTemplateService.findOne(createDto.templateId);
        break;
      case MessageChannel.EMAIL:
        template = await this.emailTemplateService.findOne(createDto.templateId);
        break;
      case MessageChannel.WHATSAPP:
        template = await this.whatsappTemplateService.findOne(createDto.templateId);
        break;
      case MessageChannel.TELEGRAM:
        template = await this.telegramTemplateService.findOne(createDto.templateId);
        break;
      default:
        throw new BadRequestException(`Канал ${channel} не поддерживается`);
    }

    // Проверяем существование сегмента (если указан)
    let segment = null;
    if (createDto.segmentId) {
      segment = await this.segmentService.findOne(createDto.segmentId);
    }

    // Создаем кампанию
    const campaign = this.campaignRepository.create({
      name: createDto.name,
      description: createDto.description,
      templateId: createDto.templateId,
      channel: channelType,
      channels: [channelType], // Single channel for now
      segment,
      type: createDto.type || CampaignType.IMMEDIATE,
      scheduledAt: createDto.scheduledAt ? new Date(createDto.scheduledAt) : null,
      settings: {
        channels: [channelType],
        ...createDto.settings,
      },
      createdBy: user,
    });

    const savedCampaign = await this.campaignRepository.save(campaign);

    // Если есть сегмент, подготавливаем сообщения
    if (segment) {
      await this.prepareCampaignMessages(savedCampaign.id);
    }

    return this.findOne(savedCampaign.id);
  }

  /**
   * Map MessageChannel to MessageChannelType
   */
  private mapChannelToChannelType(channel: MessageChannel): MessageChannelType {
    const mapping = {
      [MessageChannel.SMS]: MessageChannelType.SMS,
      [MessageChannel.EMAIL]: MessageChannelType.EMAIL,
      [MessageChannel.WHATSAPP]: MessageChannelType.WHATSAPP,
      [MessageChannel.TELEGRAM]: MessageChannelType.TELEGRAM,
      [MessageChannel.WEBHOOK]: MessageChannelType.WEBHOOK,
    };
    return mapping[channel] || MessageChannelType.SMS;
  }

  /**
   * Map MessageChannelType to MessageChannel
   */
  private mapChannelTypeToChannel(channelType: MessageChannelType): MessageChannel {
    const mapping = {
      [MessageChannelType.SMS]: MessageChannel.SMS,
      [MessageChannelType.EMAIL]: MessageChannel.EMAIL,
      [MessageChannelType.WHATSAPP]: MessageChannel.WHATSAPP,
      [MessageChannelType.TELEGRAM]: MessageChannel.TELEGRAM,
      [MessageChannelType.WEBHOOK]: MessageChannel.WEBHOOK,
    };
    return mapping[channelType] || MessageChannel.SMS;
  }

  /**
   * Получение всех кампаний
   */
  async findAll(filters?: {
    status?: CampaignStatus;
    type?: CampaignType;
    search?: string;
  }): Promise<MessageCampaign[]> {
    const query = this.campaignRepository.createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.segment', 'segment')
      .leftJoinAndSelect('campaign.createdBy', 'createdBy')
      .orderBy('campaign.createdAt', 'DESC');

    if (filters?.status) {
      query.andWhere('campaign.status = :status', { status: filters.status });
    }

    if (filters?.type) {
      query.andWhere('campaign.type = :type', { type: filters.type });
    }

    if (filters?.search) {
      query.andWhere(
        '(campaign.name ILIKE :search OR campaign.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return await query.getMany();
  }

  /**
   * Получение кампании по ID
   */
  async findOne(id: string): Promise<MessageCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['segment', 'createdBy'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    // Динамически загружаем шаблон на основе канала
    if (campaign.templateId && campaign.channel) {
      let template;
      const channel = this.mapChannelTypeToChannel(campaign.channel);
      
      switch (channel) {
        case MessageChannel.SMS:
          template = await this.smsTemplateService.findOne(campaign.templateId);
          break;
        case MessageChannel.EMAIL:
          template = await this.emailTemplateService.findOne(campaign.templateId);
          break;
        case MessageChannel.WHATSAPP:
          template = await this.whatsappTemplateService.findOne(campaign.templateId);
          break;
        case MessageChannel.TELEGRAM:
          template = await this.telegramTemplateService.findOne(campaign.templateId);
          break;
      }
      // Добавляем шаблон в объект кампании
      (campaign as any).templateData = template;
    }

    return campaign;
  }

  /**
   * Обновление кампании
   */
  async update(id: string, updateDto: UpdateCampaignDto): Promise<MessageCampaign> {
    const campaign = await this.findOne(id);

    // Проверяем, можно ли редактировать кампанию
    if ([CampaignStatus.SENDING, CampaignStatus.COMPLETED].includes(campaign.status)) {
      throw new BadRequestException('Cannot edit campaign in SENDING or COMPLETED status');
    }

    if (updateDto.templateId) {
      // Проверяем существование шаблона в зависимости от канала
      const channel = updateDto.channel || this.mapChannelTypeToChannel(campaign.channel);
      let template;
      
      switch (channel) {
        case MessageChannel.SMS:
          template = await this.smsTemplateService.findOne(updateDto.templateId);
          break;
        case MessageChannel.EMAIL:
          template = await this.emailTemplateService.findOne(updateDto.templateId);
          break;
        case MessageChannel.WHATSAPP:
          template = await this.whatsappTemplateService.findOne(updateDto.templateId);
          break;
        case MessageChannel.TELEGRAM:
          template = await this.telegramTemplateService.findOne(updateDto.templateId);
          break;
        default:
          throw new BadRequestException(`Unsupported channel: ${channel}`);
      }
      
      if (!template) {
        throw new NotFoundException(`Template with ID ${updateDto.templateId} not found for channel ${channel}`);
      }

      // Обновляем templateId и channel
      campaign.templateId = updateDto.templateId;
      if (updateDto.channel) {
        campaign.channel = this.mapChannelToChannelType(updateDto.channel);
      }
    }

    if (updateDto.segmentId) {
      campaign.segment = await this.segmentService.findOne(updateDto.segmentId);
    }

    Object.assign(campaign, {
      name: updateDto.name,
      description: updateDto.description,
      type: updateDto.type,
      scheduledAt: updateDto.scheduledAt ? new Date(updateDto.scheduledAt) : campaign.scheduledAt,
      settings: updateDto.settings ? {
        ...campaign.settings,
        ...updateDto.settings,
      } : campaign.settings,
    });

    return await this.campaignRepository.save(campaign);
  }

  /**
   * Подготовка сообщений для кампании
   * Creates message records in the correct table based on campaign channel
   */
  async prepareCampaignMessages(campaignId: string): Promise<void> {
    const campaign = await this.findOne(campaignId);

    if (!campaign.segment) {
      throw new BadRequestException('Campaign must have a segment');
    }

    const template = (campaign as any).templateData;
    if (!template) {
      throw new BadRequestException('Campaign must have a template');
    }

    // Получаем контакты из сегмента
    const phoneNumbers = await this.segmentService.getSegmentPhoneNumbers(campaign.segment.id);
    this.logger.log(`Preparing ${phoneNumbers.length} messages for campaign ${campaignId} (channel: ${campaign.channel})`);

    // Получаем правильный репозиторий для канала
    const messageRepository = this.getMessageRepository(campaign.channel);
    const StatusEnum = this.getMessageStatusEnum(campaign.channel);

    // Создаём сообщения для каждого контакта в правильной таблице
    const messages = phoneNumbers.map((contact) => {
      const messageData: any = {
        campaign: { id: campaign.id } as any,
        contact: { id: contact.contactId } as any,
        phoneNumber: contact.phoneNumber,
        content: template.content,
        status: StatusEnum.PENDING,
      };

      // Для SMS добавляем segmentsCount
      if (campaign.channel === MessageChannelType.SMS) {
        messageData.segmentsCount = this.calculateSegments(template.content);
      }

      // Для Telegram используем chatId вместо phoneNumber
      if (campaign.channel === MessageChannelType.TELEGRAM) {
        messageData.chatId = contact.phoneNumber; // Временно, нужно будет добавить chatId в сегмент
      }

      return messageRepository.create(messageData);
    });

    await messageRepository.save(messages);

    // Обновляем счётчики кампании
    await this.campaignRepository.update(campaignId, {
      totalRecipients: messages.length,
    });

    this.logger.log(`Created ${messages.length} messages in ${campaign.channel}_messages table for campaign ${campaignId}`);
  }

  /**
   * Запуск кампании
   */
  async startCampaign(campaignId: string): Promise<MessageCampaign> {
    const campaign = await this.findOne(campaignId);

    if (campaign.status !== CampaignStatus.DRAFT && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException('Campaign can only be started from DRAFT or SCHEDULED status');
    }

    // Проверяем наличие сообщений
    const messageRepository = this.getMessageRepository(campaign.channel);
    const messagesCount = await messageRepository.count({
      where: { campaign: { id: campaignId } },
    });

    if (messagesCount === 0) {
      throw new BadRequestException('Campaign has no messages to send');
    }

    campaign.status = CampaignStatus.SENDING;
    campaign.startedAt = new Date();
    await this.campaignRepository.save(campaign);

    // Запускаем процесс отправки через очередь
    if (this.messageQueueService) {
      this.logger.log(`Starting campaign ${campaignId} via MessageQueueService (channel: ${campaign.channel})`);
      await this.queueCampaignMessages(campaignId);
    } else {
      this.logger.warn(`MessageQueueService not available for campaign ${campaignId}`);
    }

    return campaign;
  }

  /**
   * Queue campaign messages for parallel processing via RabbitMQ
   */
  private async queueCampaignMessages(campaignId: string): Promise<void> {
    if (!this.messageQueueService) {
      this.logger.warn('Message queue service not available');
      return;
    }

    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      select: ['id', 'channel', 'templateId'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Получаем правильный репозиторий для канала
    const messageRepository = this.getMessageRepository(campaign.channel);
    const StatusEnum = this.getMessageStatusEnum(campaign.channel);

    // Get all pending messages
    const pendingMessages = await messageRepository.find({
      where: {
        campaign: { id: campaignId },
        status: StatusEnum.PENDING,
      },
      relations: ['contact', 'lead'],
    });

    if (pendingMessages.length === 0) {
      this.logger.log(`No pending messages for campaign ${campaignId}`);
      await this.checkCampaignCompletion(campaignId);
      return;
    }

    // Queue each message to the correct channel queue
    const channel = this.mapChannelTypeToChannel(campaign.channel);
    let queuedCount = 0;

    for (const message of pendingMessages) {
      try {
        await this.messageQueueService.queueNotification({
          channel: channel,
          templateId: campaign.templateId,
          recipient: {
            phoneNumber: message.phoneNumber || (message as any).chatId,
            contactId: message.contact?.id,
            leadId: message.lead?.id,
          },
          priority: 'normal' as any,
          maxRetries: 3,
          metadata: {
            messageId: message.id,
            campaignId: campaign.id,
            ...(message.metadata || {}),
          },
        });
        queuedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to queue message ${message.id} for campaign ${campaignId}`,
          error.stack
        );
      }
    }

    this.logger.log(`Queued ${queuedCount}/${pendingMessages.length} messages for campaign ${campaignId} (channel: ${campaign.channel})`);
  }

  /**
   * Приостановка кампании
   */
  async pauseCampaign(campaignId: string): Promise<MessageCampaign> {
    const campaign = await this.findOne(campaignId);

    if (campaign.status !== CampaignStatus.SENDING) {
      throw new BadRequestException('Only SENDING campaigns can be paused');
    }

    campaign.status = CampaignStatus.PAUSED;
    campaign.pausedAt = new Date();

    return await this.campaignRepository.save(campaign);
  }

  /**
   * Возобновление кампании
   */
  async resumeCampaign(campaignId: string): Promise<MessageCampaign> {
    const campaign = await this.findOne(campaignId);

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Only PAUSED campaigns can be resumed');
    }

    campaign.status = CampaignStatus.SENDING;
    await this.campaignRepository.save(campaign);

    // Возобновляем отправку через очередь
    if (this.messageQueueService) {
      this.logger.log(`Resuming campaign ${campaignId} via MessageQueueService (channel: ${campaign.channel})`);
      await this.queueCampaignMessages(campaignId);
    }

    return campaign;
  }

  /**
   * Отмена кампании
   */
  async cancelCampaign(campaignId: string): Promise<MessageCampaign> {
    const campaign = await this.findOne(campaignId);

    if ([CampaignStatus.COMPLETED, CampaignStatus.CANCELLED].includes(campaign.status)) {
      throw new BadRequestException('Campaign is already completed or cancelled');
    }

    campaign.status = CampaignStatus.CANCELLED;
    campaign.completedAt = new Date();

    // Отменяем все ожидающие сообщения в правильной таблице
    const messageRepository = this.getMessageRepository(campaign.channel);
    const StatusEnum = this.getMessageStatusEnum(campaign.channel);

    await messageRepository.update(
      { campaign: { id: campaignId }, status: StatusEnum.PENDING },
      { 
        status: StatusEnum.FAILED, 
        metadata: { errorMessage: 'Campaign cancelled' } as any 
      }
    );

    return await this.campaignRepository.save(campaign);
  }

  /**
   * Проверка завершения кампании
   */
  private async checkCampaignCompletion(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    // Count pending messages in the correct table
    const messageRepository = this.getMessageRepository(campaign.channel);
    const StatusEnum = this.getMessageStatusEnum(campaign.channel);
    
    const pendingCount = await messageRepository.count({
      where: {
        campaign: { id: campaignId },
        status: StatusEnum.PENDING,
      },
    });

    if (pendingCount === 0 && campaign.status === CampaignStatus.SENDING) {
      campaign.status = CampaignStatus.COMPLETED;
      campaign.completedAt = new Date();
      campaign.completionPercentage = 100;

      await this.campaignRepository.save(campaign);
      this.logger.log(`Campaign ${campaignId} completed`);
    }
  }

  /**
   * Получение статистики кампании
   */
  async getCampaignStats(campaignId: string): Promise<{
    campaign: MessageCampaign;
    messagesByStatus: Record<string, number>;
  }> {
    const campaign = await this.findOne(campaignId);
    const messageRepository = this.getMessageRepository(campaign.channel);

    const messageStats = await messageRepository
      .createQueryBuilder('message')
      .select('message.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('message.campaignId = :campaignId', { campaignId })
      .groupBy('message.status')
      .getRawMany();

    const messagesByStatus = messageStats.reduce((acc, stat) => {
      acc[stat.status] = parseInt(stat.count);
      return acc;
    }, {});

    return {
      campaign,
      messagesByStatus,
    };
  }

  /**
   * Получение временной статистики кампании
   */
  async getCampaignTimeline(
    campaignId: string,
    interval: 'hour' | 'day' = 'hour',
    hours: number = 24
  ): Promise<{
    timeline: Array<{
      timestamp: string;
      sent: number;
      delivered: number;
      failed: number;
    }>;
  }> {
    const campaign = await this.findOne(campaignId);
    const messageRepository = this.getMessageRepository(campaign.channel);

    // Определяем начальную дату
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - hours * 60 * 60 * 1000);

    // Определяем формат группировки в зависимости от интервала
    let dateFormat: string;
    if (interval === 'hour') {
      dateFormat = "TO_CHAR(message.createdAt, 'YYYY-MM-DD HH24:00:00')";
    } else {
      dateFormat = "TO_CHAR(message.createdAt, 'YYYY-MM-DD')";
    }

    // Получаем данные с группировкой по времени и статусу
    const timelineData = await messageRepository
      .createQueryBuilder('message')
      .select(`${dateFormat} as timestamp`)
      .addSelect('message.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('message.campaignId = :campaignId', { campaignId })
      .andWhere('message.createdAt >= :startDate', { startDate })
      .andWhere('message.createdAt <= :endDate', { endDate })
      .groupBy(`${dateFormat}`)
      .addGroupBy('message.status')
      .orderBy(`${dateFormat}`, 'ASC')
      .getRawMany();

    // Создаем карту временных меток
    const timeMap = new Map<string, { sent: number; delivered: number; failed: number }>();

    // Инициализируем все временные метки нулями
    for (let i = 0; i < hours; i++) {
      const timestamp = new Date(startDate.getTime() + i * 60 * 60 * 1000);
      const key = interval === 'hour' 
        ? timestamp.toISOString().substring(0, 13) + ':00:00'
        : timestamp.toISOString().substring(0, 10);
      
      if (!timeMap.has(key)) {
        timeMap.set(key, { sent: 0, delivered: 0, failed: 0 });
      }
    }

    // Заполняем данными из БД
    timelineData.forEach(row => {
      const timestamp = row.timestamp;
      const status = row.status;
      const count = parseInt(row.count);

      if (!timeMap.has(timestamp)) {
        timeMap.set(timestamp, { sent: 0, delivered: 0, failed: 0 });
      }

      const data = timeMap.get(timestamp)!;
      
      if (status === 'delivered') {
        data.delivered = count;
        data.sent += count;
      } else if (status === 'failed') {
        data.failed = count;
        data.sent += count;
      } else if (status === 'sent') {
        data.sent += count;
      }
    });

    // Конвертируем в массив
    const timeline = Array.from(timeMap.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        ...data
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return { timeline };
  }

  /**
   * Удаление кампании
   */
  async remove(campaignId: string): Promise<void> {
    const campaign = await this.findOne(campaignId);

    if (campaign.status === CampaignStatus.SENDING) {
      throw new BadRequestException('Cannot delete campaign that is currently sending');
    }

    await this.campaignRepository.remove(campaign);
  }

  /**
   * Cron: Проверка запланированных кампаний
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCampaigns(): Promise<void> {
    const scheduledCampaigns = await this.campaignRepository.find({
      where: {
        status: CampaignStatus.SCHEDULED,
      },
    });

    const now = new Date();

    for (const campaign of scheduledCampaigns) {
      if (campaign.scheduledAt && campaign.scheduledAt <= now) {
        this.logger.log(`Starting scheduled campaign ${campaign.id}`);
        await this.startCampaign(campaign.id);
      }
    }
  }

  private calculateSegments(message: string): number {
    const hasUnicode = /[^\x00-\x7F]/.test(message);
    const segmentLength = hasUnicode ? 70 : 160;
    return Math.ceil(message.length / segmentLength);
  }
}
