import { Injectable, NotFoundException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MessageCampaign, CampaignStatus, CampaignType, MessageChannelType } from '../entities/message-campaign.entity';
import { SmsMessage, MessageStatus } from '../entities/sms-message.entity';
import { CreateCampaignDto, UpdateCampaignDto } from '../dto/campaign.dto';
import { SmsTemplateService } from './sms-template.service';
import { EmailTemplateService } from './email-template.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { TelegramTemplateService } from './telegram-template.service';
import { SmsSegmentService } from './sms-segment.service';
import { SmsProviderService } from './sms-provider.service';
import { User } from '../../user/user.entity';
import { QueueProducerService } from '../../queues/queue-producer.service';
import { MessageQueueService } from './message-queue.service';

@Injectable()
export class SmsCampaignService {
  private readonly logger = new Logger(SmsCampaignService.name);

  constructor(
    @InjectRepository(MessageCampaign)
    private campaignRepository: Repository<MessageCampaign>,
    @InjectRepository(SmsMessage)
    private messageRepository: Repository<SmsMessage>,
    private smsTemplateService: SmsTemplateService,
    private emailTemplateService: EmailTemplateService,
    private whatsappTemplateService: WhatsAppTemplateService,
    private telegramTemplateService: TelegramTemplateService,
    private segmentService: SmsSegmentService,
    private providerService: SmsProviderService,
    @Optional() private queueProducer?: QueueProducerService,
    @Optional() private messageQueueService?: MessageQueueService,
  ) {}

  /**
   * Создание новой кампании
   */
  async create(createDto: CreateCampaignDto, user: User): Promise<MessageCampaign> {
    // Определяем канал (по умолчанию SMS для обратной совместимости)
    const channel = createDto.channel || MessageChannelType.SMS;
    
    // Проверяем существование шаблона в зависимости от канала
    let template;
    switch (channel) {
      case MessageChannelType.SMS:
        template = await this.smsTemplateService.findOne(createDto.templateId);
        break;
      case MessageChannelType.EMAIL:
        template = await this.emailTemplateService.findOne(createDto.templateId);
        break;
      case MessageChannelType.WHATSAPP:
        template = await this.whatsappTemplateService.findOne(createDto.templateId);
        break;
      case MessageChannelType.TELEGRAM:
        template = await this.telegramTemplateService.findOne(createDto.templateId);
        break;
      default:
        throw new BadRequestException(`Канал ${channel} не поддерживается`);
    }

    // Проверяем существование сегмента (если указан)
    let segment = null;
    if (createDto.segmentId && createDto.segmentId !== 'all') {
      segment = await this.segmentService.findOne(createDto.segmentId);
    }

    // Создаем кампанию с новыми полями templateId и channel
    const campaign = this.campaignRepository.create({
      name: createDto.name,
      description: createDto.description,
      templateId: createDto.templateId, // Просто UUID без FK
      channel: channel, // Канал для определения типа шаблона
      segment,
      type: createDto.type || CampaignType.IMMEDIATE,
      scheduledAt: createDto.scheduledAt ? new Date(createDto.scheduledAt) : null,
      settings: createDto.settings || {},
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
   * Получение всех кампаний
   */
  async findAll(filters?: {
    status?: CampaignStatus;
    type?: CampaignType;
    search?: string;
  }): Promise<MessageCampaign[]> {
    const query = this.campaignRepository.createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.template', 'template')
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
      relations: ['template', 'segment', 'createdBy'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    // Динамически загружаем шаблон на основе канала
    if (campaign.templateId && campaign.channel) {
      let template;
      switch (campaign.channel) {
        case MessageChannelType.SMS:
          template = await this.smsTemplateService.findOne(campaign.templateId);
          break;
        case MessageChannelType.EMAIL:
          template = await this.emailTemplateService.findOne(campaign.templateId);
          break;
        case MessageChannelType.WHATSAPP:
          template = await this.whatsappTemplateService.findOne(campaign.templateId);
          break;
        case MessageChannelType.TELEGRAM:
          template = await this.telegramTemplateService.findOne(campaign.templateId);
          break;
      }
      // Добавляем шаблон в объект кампании для обратной совместимости
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
      const channel = updateDto.channel || campaign.channel;
      let template;
      switch (channel) {
        case MessageChannelType.SMS:
          template = await this.smsTemplateService.findOne(updateDto.templateId);
          break;
        case MessageChannelType.EMAIL:
          template = await this.emailTemplateService.findOne(updateDto.templateId);
          break;
        case MessageChannelType.WHATSAPP:
          template = await this.whatsappTemplateService.findOne(updateDto.templateId);
          break;
        case MessageChannelType.TELEGRAM:
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
        campaign.channel = updateDto.channel;
      }
    }

    if (updateDto.segmentId && updateDto.segmentId !== 'all') {
      campaign.segment = await this.segmentService.findOne(updateDto.segmentId);
    } else if (updateDto.segmentId === 'all') {
      campaign.segment = null;
    }

    Object.assign(campaign, {
      name: updateDto.name,
      description: updateDto.description,
      type: updateDto.type,
      scheduledAt: updateDto.scheduledAt ? new Date(updateDto.scheduledAt) : campaign.scheduledAt,
      settings: updateDto.settings || campaign.settings,
    });

    return await this.campaignRepository.save(campaign);
  }

  /**
   * Удаление кампании
   */
  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);

    if (campaign.status === CampaignStatus.SENDING) {
      throw new BadRequestException('Cannot delete campaign that is currently sending');
    }

    await this.campaignRepository.remove(campaign);
  }

  /**
   * Подготовка сообщений для кампании
   */
  async prepareCampaignMessages(campaignId: string): Promise<void> {
    const campaign = await this.findOne(campaignId);

    if (!campaign.segment) {
      throw new BadRequestException('Campaign must have a segment');
    }

    // Получаем шаблон (из нового поля templateData или старого template)
    const template = (campaign as any).templateData || campaign.templateId;
    
    if (!template) {
      throw new BadRequestException('Campaign must have a template');
    }

    // Получаем контакты из сегмента
    const phoneNumbers = await this.segmentService.getSegmentPhoneNumbers(campaign.segment.id);

    this.logger.log(`Preparing ${phoneNumbers.length} messages for campaign ${campaignId}`);

    // Создаём сообщения для каждого контакта
    const messages = phoneNumbers.map((contact) => {
      // Рендерим шаблон (в базовой версии без переменных)
      const content = template.content;

      return this.messageRepository.create({
        campaign: { id: campaign.id } as any,
        contact: { id: contact.contactId } as any,
        phoneNumber: contact.phoneNumber,
        content,
        status: MessageStatus.PENDING,
        segmentsCount: this.calculateSegments(content),
      });
    });

    await this.messageRepository.save(messages);

    // Обновляем счётчики кампании
    await this.campaignRepository.update(campaignId, {
      totalRecipients: messages.length,
    });
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
    const messagesCount = await this.messageRepository.count({
      where: { campaign: { id: campaignId } },
    });

    if (messagesCount === 0) {
      throw new BadRequestException('Campaign has no messages to send');
    }

    campaign.status = CampaignStatus.SENDING;
    campaign.startedAt = new Date();

    await this.campaignRepository.save(campaign);

    // Запускаем процесс отправки через очередь (если доступна) или напрямую
    if (this.messageQueueService) {
      this.logger.log(`Starting campaign ${campaignId} via MessageQueueService (channel: ${campaign.channel})`);
      await this.queueCampaignMessages(campaignId);
    } else {
      this.logger.warn(`MessageQueueService not available for campaign ${campaignId}, falling back to sync`);
      this.processCampaignMessages(campaignId);
    }

    return campaign;
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

    // Возобновляем отправку через очередь или напрямую
    if (this.messageQueueService) {
      this.logger.log(`Resuming campaign ${campaignId} via MessageQueueService (channel: ${campaign.channel})`);
      await this.queueCampaignMessages(campaignId);
    } else {
      this.logger.warn(`MessageQueueService not available for campaign ${campaignId}, falling back to sync`);
      this.processCampaignMessages(campaignId);
    }

    return campaign;
  }

  /**
   * Queue campaign messages for parallel processing via RabbitMQ
   */
  private async queueCampaignMessages(campaignId: string): Promise<void> {
    if (!this.messageQueueService) {
      this.logger.warn('Message queue service not available, falling back to sync processing');
      return this.processCampaignMessages(campaignId);
    }

    // Get campaign to know the channel
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      select: ['id', 'channel', 'templateId'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign ${campaignId} not found`);
    }

    // Get all pending messages with full data
    const pendingMessages = await this.messageRepository.find({
      where: {
        campaign: { id: campaignId },
        status: MessageStatus.PENDING,
      },
      select: ['id', 'phoneNumber', 'content', 'metadata'],
      relations: ['contact', 'lead'],
    });

    if (pendingMessages.length === 0) {
      this.logger.log(`No pending messages for campaign ${campaignId}`);
      await this.checkCampaignCompletion(campaignId);
      return;
    }

    // Queue each message individually to the correct channel queue
    let queuedCount = 0;
    for (const message of pendingMessages) {
      try {
        await this.messageQueueService.queueNotification({
          channel: campaign.channel as MessageChannelType, // MessageChannelType совместим с MessageChannel по значениям
          templateId: campaign.templateId,
          recipient: {
            phoneNumber: message.phoneNumber,
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
   * Отмена кампании
   */
  async cancelCampaign(campaignId: string): Promise<MessageCampaign> {
    const campaign = await this.findOne(campaignId);

    if ([CampaignStatus.COMPLETED, CampaignStatus.CANCELLED].includes(campaign.status)) {
      throw new BadRequestException('Campaign is already completed or cancelled');
    }

    campaign.status = CampaignStatus.CANCELLED;
    campaign.completedAt = new Date();

    // Отменяем все ожидающие сообщения
    await this.messageRepository.update(
      { campaign: { id: campaignId }, status: MessageStatus.PENDING },
      { status: MessageStatus.FAILED, metadata: { errorMessage: 'Campaign cancelled' } as any }
    );

    return await this.campaignRepository.save(campaign);
  }

  /**
   * Процесс отправки сообщений кампании
   */
  private async processCampaignMessages(campaignId: string): Promise<void> {
    const campaign = await this.findOne(campaignId);

    // Получаем скорость отправки из настроек SMS или из общих настроек (для обратной совместимости)
    const sendingSpeed = campaign.settings?.sms?.sendingSpeed || (campaign.settings as any)?.sendingSpeed || 60; // По умолчанию 60 сообщений в минуту
    const delayMs = (60 * 1000) / sendingSpeed;

    // Получаем ожидающие сообщения
    const pendingMessages = await this.messageRepository.find({
      where: {
        campaign: { id: campaignId },
        status: MessageStatus.PENDING,
      },
      take: 100, // Обрабатываем по 100 за раз
    });

    for (const message of pendingMessages) {
      // Проверяем статус кампании (может быть приостановлена)
      const currentCampaign = await this.campaignRepository.findOne({
        where: { id: campaignId },
        select: ['status'],
      });

      if (currentCampaign.status !== CampaignStatus.SENDING) {
        this.logger.log(`Campaign ${campaignId} is not in SENDING status, stopping`);
        break;
      }

      await this.sendMessage(message.id);

      // Задержка между сообщениями
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Проверяем, завершена ли кампания
    await this.checkCampaignCompletion(campaignId);
  }

  /**
   * Отправка одного сообщения
   */
  private async sendMessage(messageId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['campaign'],
    });

    if (!message || message.status !== MessageStatus.PENDING) {
      return;
    }

    try {
      // Обновляем статус на "отправляется"
      message.status = MessageStatus.QUEUED;
      await this.messageRepository.save(message);

      // Отправляем через провайдера
      const result = await this.providerService.sendSms(
        message.phoneNumber,
        message.content
      );

      if (result.success) {
        message.status = MessageStatus.SENT;
        message.sentAt = new Date();
        message.cost = result.cost || 0;
        message.metadata = {
          ...message.metadata,
          providerId: result.providerId,
        };

        // Обновляем счётчики кампании
        await this.campaignRepository.increment(
          { id: message.campaign.id },
          'totalSent',
          1
        );
      } else {
        message.status = MessageStatus.FAILED;
        message.failedAt = new Date();
        message.metadata = {
          ...message.metadata,
          errorMessage: result.error,
          errorCode: result.errorCode,
        };

        await this.campaignRepository.increment(
          { id: message.campaign.id },
          'totalFailed',
          1
        );
      }

      await this.messageRepository.save(message);

      // Обновляем статистику использования шаблона
      try {
        if (message.campaign.templateId) {
          // Используем templateId напрямую, так как campaign.channel содержит MessageChannelType
          // MessageChannelType и MessageChannel имеют одинаковые значения ('sms', 'email', и т.д.)
          const channelValue = message.campaign.channel;
          
          switch (channelValue) {
            case 'sms':
              await this.smsTemplateService.incrementUsageCount(message.campaign.templateId);
              break;
            case 'email':
              await this.emailTemplateService.incrementUsageCount(message.campaign.templateId);
              break;
            case 'whatsapp':
              await this.whatsappTemplateService.incrementUsageCount(message.campaign.templateId);
              break;
            case 'telegram':
              await this.telegramTemplateService.incrementUsageCount(message.campaign.templateId);
              break;
          }
        }
      } catch (error) {
        // Игнорируем ошибки обновления счетчика, это не критично
        this.logger.warn(`Failed to increment usage count for template ${message.campaign.templateId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send message ${messageId}: ${error.message}`, error.stack);

      message.status = MessageStatus.FAILED;
      message.failedAt = new Date();
      message.metadata = {
        ...message.metadata,
        errorMessage: error.message,
      };

      await this.messageRepository.save(message);
    }
  }

  /**
   * Проверка завершения кампании
   */
  private async checkCampaignCompletion(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    // Проверяем, остались ли необработанные сообщения
    const pendingCount = await this.messageRepository.count({
      where: {
        campaign: { id: campaignId },
        status: MessageStatus.PENDING,
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
    deliveryRate: number;
    failureRate: number;
    avgCost: number;
  }> {
    const campaign = await this.findOne(campaignId);

    const messageStats = await this.messageRepository
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

    const deliveryRate = campaign.totalSent > 0 ? (campaign.totalDelivered / campaign.totalSent) * 100 : 0;
    const failureRate = campaign.totalRecipients > 0 ? (campaign.totalFailed / campaign.totalRecipients) * 100 : 0;

    const avgCostResult = await this.messageRepository
      .createQueryBuilder('message')
      .select('AVG(message.cost)', 'avgCost')
      .where('message.campaignId = :campaignId', { campaignId })
      .getRawOne();

    return {
      campaign,
      messagesByStatus,
      deliveryRate,
      failureRate,
      avgCost: parseFloat(avgCostResult?.avgCost || '0'),
    };
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
