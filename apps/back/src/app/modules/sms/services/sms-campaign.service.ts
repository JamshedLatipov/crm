import { Injectable, NotFoundException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SmsCampaign, CampaignStatus, CampaignType } from '../entities/sms-campaign.entity';
import { SmsMessage, MessageStatus } from '../entities/sms-message.entity';
import { CreateCampaignDto, UpdateCampaignDto } from '../dto/campaign.dto';
import { SmsTemplateService } from './sms-template.service';
import { SmsSegmentService } from './sms-segment.service';
import { SmsProviderService } from './sms-provider.service';
import { User } from '../../user/user.entity';
import { QueueProducerService } from '../../queues/queue-producer.service';

@Injectable()
export class SmsCampaignService {
  private readonly logger = new Logger(SmsCampaignService.name);

  constructor(
    @InjectRepository(SmsCampaign)
    private campaignRepository: Repository<SmsCampaign>,
    @InjectRepository(SmsMessage)
    private messageRepository: Repository<SmsMessage>,
    private templateService: SmsTemplateService,
    private segmentService: SmsSegmentService,
    private providerService: SmsProviderService,
    @Optional() private queueProducer?: QueueProducerService,
  ) {}

  /**
   * Создание новой кампании
   */
  async create(createDto: CreateCampaignDto, user: User): Promise<SmsCampaign> {
    // Проверяем существование шаблона
    const template = await this.templateService.findOne(createDto.templateId);

    // Проверяем существование сегмента (если указан)
    let segment = null;
    if (createDto.segmentId) {
      segment = await this.segmentService.findOne(createDto.segmentId);
    }

    const campaign = this.campaignRepository.create({
      name: createDto.name,
      description: createDto.description,
      template,
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
  }): Promise<SmsCampaign[]> {
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
  async findOne(id: string): Promise<SmsCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: ['template', 'segment', 'createdBy'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }

    return campaign;
  }

  /**
   * Обновление кампании
   */
  async update(id: string, updateDto: UpdateCampaignDto): Promise<SmsCampaign> {
    const campaign = await this.findOne(id);

    // Проверяем, можно ли редактировать кампанию
    if ([CampaignStatus.SENDING, CampaignStatus.COMPLETED].includes(campaign.status)) {
      throw new BadRequestException('Cannot edit campaign in SENDING or COMPLETED status');
    }

    if (updateDto.templateId) {
      campaign.template = await this.templateService.findOne(updateDto.templateId);
    }

    if (updateDto.segmentId) {
      campaign.segment = await this.segmentService.findOne(updateDto.segmentId);
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

    // Получаем контакты из сегмента
    const phoneNumbers = await this.segmentService.getSegmentPhoneNumbers(campaign.segment.id);

    this.logger.log(`Preparing ${phoneNumbers.length} messages for campaign ${campaignId}`);

    // Создаём сообщения для каждого контакта
    const messages = phoneNumbers.map((contact) => {
      // Рендерим шаблон (в базовой версии без переменных)
      const content = campaign.template.content;

      return this.messageRepository.create({
        campaign,
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
      pendingCount: messages.length,
    });
  }

  /**
   * Запуск кампании
   */
  async startCampaign(campaignId: string): Promise<SmsCampaign> {
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
    if (this.queueProducer) {
      await this.queueCampaignMessages(campaignId);
    } else {
      this.processCampaignMessages(campaignId);
    }

    return campaign;
  }

  /**
   * Приостановка кампании
   */
  async pauseCampaign(campaignId: string): Promise<SmsCampaign> {
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
  async resumeCampaign(campaignId: string): Promise<SmsCampaign> {
    const campaign = await this.findOne(campaignId);

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Only PAUSED campaigns can be resumed');
    }

    campaign.status = CampaignStatus.SENDING;

    await this.campaignRepository.save(campaign);

    // Возобновляем отправку через очередь или напрямую
    if (this.queueProducer) {
      await this.queueCampaignMessages(campaignId);
    } else {
      this.processCampaignMessages(campaignId);
    }

    return campaign;
  }

  /**
   * Queue campaign messages for parallel processing via RabbitMQ
   */
  private async queueCampaignMessages(campaignId: string): Promise<void> {
    if (!this.queueProducer) {
      this.logger.warn('Queue producer not available, falling back to sync processing');
      return this.processCampaignMessages(campaignId);
    }

    // Get all pending messages
    const pendingMessages = await this.messageRepository.find({
      where: {
        campaign: { id: campaignId },
        status: MessageStatus.PENDING,
      },
      select: ['id'],
    });

    if (pendingMessages.length === 0) {
      this.logger.log(`No pending messages for campaign ${campaignId}`);
      await this.checkCampaignCompletion(campaignId);
      return;
    }

    // Queue in batches for fan-out
    const batchSize = 100;
    for (let i = 0; i < pendingMessages.length; i += batchSize) {
      const batch = pendingMessages.slice(i, i + batchSize);
      const messageIds = batch.map(m => m.id);
      
      await this.queueProducer.queueSmsBatch(campaignId, messageIds);
    }

    this.logger.log(`Queued ${pendingMessages.length} messages for campaign ${campaignId}`);
  }

  /**
   * Отмена кампании
   */
  async cancelCampaign(campaignId: string): Promise<SmsCampaign> {
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

    const sendingSpeed = campaign.settings?.sendingSpeed || 60; // По умолчанию 60 сообщений в минуту
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
          'sentCount',
          1
        );
        await this.campaignRepository.decrement(
          { id: message.campaign.id },
          'pendingCount',
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
          'failedCount',
          1
        );
        await this.campaignRepository.decrement(
          { id: message.campaign.id },
          'pendingCount',
          1
        );
      }

      await this.messageRepository.save(message);

      // Обновляем статистику использования шаблона
      await this.templateService.incrementUsageCount(message.campaign.template.id);
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

    if (campaign.pendingCount === 0 && campaign.status === CampaignStatus.SENDING) {
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
    campaign: SmsCampaign;
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

    const totalSent = campaign.sentCount + campaign.deliveredCount;
    const deliveryRate = totalSent > 0 ? (campaign.deliveredCount / totalSent) * 100 : 0;
    const failureRate = campaign.totalRecipients > 0 ? (campaign.failedCount / campaign.totalRecipients) * 100 : 0;

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
