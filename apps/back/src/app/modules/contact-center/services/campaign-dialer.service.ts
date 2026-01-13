import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboundCampaign, CampaignStatus } from '../entities/outbound-campaign.entity';
import { OutboundCampaignContact, ContactStatus } from '../entities/outbound-campaign-contact.entity';
import { OutboundCampaignCall, CallOutcome } from '../entities/outbound-campaign-call.entity';
import { AriService } from '../../ari/ari.service';

interface DialerTask {
  campaignId: string;
  contactId: string;
  phone: string;
  attempts: number;
  priority: number;
}

@Injectable()
export class CampaignDialerService implements OnModuleInit {
  private readonly logger = new Logger(CampaignDialerService.name);
  private readonly activeCalls = new Map<string, string>(); // channelId -> contactId
  private readonly taskQueue: DialerTask[] = [];
  private isProcessing = false;

  constructor(
    @InjectRepository(OutboundCampaign)
    private readonly campaignRepo: Repository<OutboundCampaign>,
    @InjectRepository(OutboundCampaignContact)
    private readonly contactRepo: Repository<OutboundCampaignContact>,
    @InjectRepository(OutboundCampaignCall)
    private readonly callRepo: Repository<OutboundCampaignCall>,
    private readonly ariService: AriService,
  ) {}

  async onModuleInit() {
    this.logger.log('CampaignDialerService initialized');
    // TODO: Подписаться на события ARI когда будет доступен метод
    // this.subscribeToAriEvents();
  }

  /**
   * Cron job для обработки активных кампаний
   * Запускается каждые 30 секунд
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processActiveCampaigns() {
    if (this.isProcessing) {
      this.logger.debug('Already processing campaigns, skipping...');
      return;
    }

    try {
      this.isProcessing = true;

      // Получаем все активные кампании
      const activeCampaigns = await this.campaignRepo.find({
        where: {
          status: In([CampaignStatus.RUNNING, CampaignStatus.SCHEDULED]),
        },
        relations: ['schedules'],
      });

      for (const campaign of activeCampaigns) {
        await this.processCampaign(campaign);
      }
    } catch (error) {
      this.logger.error('Error processing campaigns:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Обработка одной кампании
   */
  private async processCampaign(campaign: OutboundCampaign) {
    try {
      // Проверяем расписание
      if (!this.isInSchedule(campaign)) {
        this.logger.debug(`Campaign ${campaign.id} is outside schedule`);
        return;
      }

      // Получаем количество активных звонков для этой кампании
      const activeCallsCount = Array.from(this.activeCalls.values()).filter(
        (contactId) => contactId.startsWith(campaign.id),
      ).length;

      // Проверяем лимит одновременных звонков
      const maxCalls = campaign.settings.simultaneousCalls || 5;
      if (activeCallsCount >= maxCalls) {
        this.logger.debug(
          `Campaign ${campaign.id} reached max concurrent calls: ${activeCallsCount}/${maxCalls}`,
        );
        return;
      }

      // Получаем контакты для обзвона
      const contactsToCall = await this.getContactsToCall(
        campaign.id,
        maxCalls - activeCallsCount,
      );

      // Инициируем звонки
      for (const contact of contactsToCall) {
        await this.initiateCall(campaign, contact);
      }
    } catch (error) {
      this.logger.error(`Error processing campaign ${campaign.id}:`, error);
    }
  }

  /**
   * Получение контактов для обзвона
   */
  private async getContactsToCall(
    campaignId: string,
    limit: number,
  ): Promise<OutboundCampaignContact[]> {
    const now = new Date();

    // Получаем контакты со статусом PENDING или те, у кого пришло время повторной попытки
    const contacts = await this.contactRepo.find({
      where: [
        {
          campaignId,
          status: ContactStatus.PENDING,
        },
        {
          campaignId,
          status: In([ContactStatus.NO_ANSWER, ContactStatus.BUSY, ContactStatus.FAILED]),
          nextAttemptAt: LessThan(now),
        },
      ],
      order: {
        nextAttemptAt: 'ASC',
        createdAt: 'ASC',
      },
      take: limit,
    });

    return contacts;
  }

  /**
   * Инициация звонка
   */
  private async initiateCall(
    campaign: OutboundCampaign,
    contact: OutboundCampaignContact,
  ) {
    try {
      this.logger.log(
        `Initiating call for campaign ${campaign.id}, contact ${contact.id}: ${contact.phone}`,
      );

      // Обновляем статус контакта
      await this.contactRepo.update(contact.id, {
        status: ContactStatus.CALLING,
        attempts: contact.attempts + 1,
        lastCallAt: new Date(),
      });

      // Создаем запись звонка
      const call = await this.callRepo.save({
        campaignId: campaign.id,
        contactId: contact.id,
        outcome: CallOutcome.FAILED, // По умолчанию, обновим после звонка
        duration: 0,
        waitTime: 0,
        createdAt: new Date(),
      });

      // Инициируем звонок через ARI
      const callerIdNumber = campaign.settings.callerIdNumber || 'unknown';
      const callerIdName = campaign.settings.callerIdName || 'Campaign';
      const maxDuration = campaign.settings.maxCallDuration || 300;

      let channel;
      switch (campaign.type) {
        case 'ivr':
          channel = await this.initiateIvrCall(
            contact.phone,
            campaign.audioFilePath!,
            callerIdNumber,
            callerIdName,
            maxDuration,
          );
          break;

        case 'agent':
          channel = await this.initiateAgentCall(
            contact.phone,
            campaign.queueId!,
            callerIdNumber,
            callerIdName,
            maxDuration,
          );
          break;

        case 'hybrid':
          channel = await this.initiateHybridCall(
            contact.phone,
            campaign.audioFilePath!,
            campaign.queueId!,
            callerIdNumber,
            callerIdName,
            maxDuration,
          );
          break;
      }

      if (channel) {
        // Сохраняем связь channel -> contact
        this.activeCalls.set(channel.id, contact.id);

        // Обновляем запись звонка с callId
        await this.callRepo.update(call.id, {
          callId: channel.id,
        });

        this.logger.log(
          `Call initiated successfully: channel=${channel.id}, contact=${contact.id}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error initiating call for contact ${contact.id}:`, error);

      // Обновляем статус контакта при ошибке
      await this.handleCallFailure(contact, error.message);
    }
  }

  /**
   * Звонок с проигрыванием IVR
   * TODO: Реализовать когда AriService будет иметь метод originate
   */
  private async initiateIvrCall(
    phone: string,
    audioPath: string,
    callerIdNumber: string,
    callerIdName: string,
    maxDuration: number,
  ) {
    try {
      // TODO: Реализовать через AriService.originate
      this.logger.warn(`IVR call to ${phone} - ARI integration pending`);
      
      // Заглушка
      return null;
      
      /*
      const channel = await this.ariService.originate({
        endpoint: `PJSIP/${phone}`,
        app: 'outbound-campaign',
        appArgs: `ivr,${audioPath}`,
        callerId: `"${callerIdName}" <${callerIdNumber}>`,
        timeout: 30,
        variables: {
          MAX_CALL_DURATION: maxDuration.toString(),
        },
      });
      return channel;
      */
    } catch (error) {
      this.logger.error(`Error creating IVR call to ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Звонок с переводом на оператора
   * TODO: Реализовать когда AriService будет иметь метод originate
   */
  private async initiateAgentCall(
    phone: string,
    queueId: number,
    callerIdNumber: string,
    callerIdName: string,
    maxDuration: number,
  ) {
    try {
      // TODO: Реализовать через AriService.originate
      this.logger.warn(`Agent call to ${phone} - ARI integration pending`);
      return null;
    } catch (error) {
      this.logger.error(`Error creating agent call to ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Гибридный звонок (IVR + Queue)
   * TODO: Реализовать когда AriService будет иметь метод originate
   */
  private async initiateHybridCall(
    phone: string,
    audioPath: string,
    queueId: number,
    callerIdNumber: string,
    callerIdName: string,
    maxDuration: number,
  ) {
    try {
      // TODO: Реализовать через AriService.originate
      this.logger.warn(`Hybrid call to ${phone} - ARI integration pending`);
      return null;
    } catch (error) {
      this.logger.error(`Error creating hybrid call to ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Подписка на события ARI
   * TODO: Реализовать когда AriService будет иметь метод originate
   */
  private subscribeToAriEvents() {
    // Заглушка для будущей интеграции
    this.logger.debug('ARI events subscription not yet implemented');
  }

  /**
   * Обработка ответа на звонок
   */
  private async handleChannelAnswered(data: any) {
    const channelId = data.channel?.id;
    if (!channelId) return;

    const contactId = this.activeCalls.get(channelId);
    if (!contactId) return;

    try {
      // Обновляем статус контакта
      await this.contactRepo.update(contactId, {
        status: ContactStatus.ANSWERED,
      });

      // Обновляем запись звонка
      await this.callRepo.update(
        { callId: channelId },
        {
          outcome: CallOutcome.ANSWERED,
          answeredAt: new Date(),
        },
      );

      this.logger.log(`Call answered: channel=${channelId}, contact=${contactId}`);
    } catch (error) {
      this.logger.error('Error handling channel answered:', error);
    }
  }

  /**
   * Обработка завершения звонка
   */
  private async handleChannelHangup(data: any) {
    const channelId = data.channel?.id;
    if (!channelId) return;

    const contactId = this.activeCalls.get(channelId);
    if (!contactId) {
      return;
    }

    try {
      const cause = data.cause || 'NORMAL_CLEARING';
      const duration = data.duration || 0;

      // Определяем outcome на основе причины завершения
      let outcome = CallOutcome.FAILED;
      let contactStatus = ContactStatus.FAILED;

      if (cause === 'NORMAL_CLEARING' || cause === 'ANSWERED') {
        outcome = CallOutcome.ANSWERED;
        contactStatus = ContactStatus.COMPLETED;
      } else if (cause === 'USER_BUSY' || cause === 'BUSY') {
        outcome = CallOutcome.BUSY;
        contactStatus = ContactStatus.BUSY;
      } else if (cause === 'NO_ANSWER' || cause === 'NOANSWER') {
        outcome = CallOutcome.NO_ANSWER;
        contactStatus = ContactStatus.NO_ANSWER;
      }

      // Обновляем запись звонка
      await this.callRepo.update(
        { callId: channelId },
        {
          outcome,
          duration,
          endedAt: new Date(),
        },
      );

      // Получаем контакт для проверки необходимости повторного звонка
      const contact = await this.contactRepo.findOne({ where: { id: contactId } });
      if (contact) {
        await this.handleContactAfterCall(contact, contactStatus, outcome);
      }

      // Удаляем из активных звонков
      this.activeCalls.delete(channelId);

      this.logger.log(
        `Call ended: channel=${channelId}, contact=${contactId}, outcome=${outcome}`,
      );
    } catch (error) {
      this.logger.error('Error handling channel hangup:', error);
    }
  }

  /**
   * Обработка контакта после звонка
   */
  private async handleContactAfterCall(
    contact: OutboundCampaignContact,
    status: ContactStatus,
    outcome: CallOutcome,
  ) {
    // Получаем кампанию для проверки настроек
    const campaign = await this.campaignRepo.findOne({
      where: { id: contact.campaignId },
    });

    if (!campaign) return;

    const maxAttempts = campaign.settings.maxAttempts || 3;
    const retryInterval = campaign.settings.retryInterval || 15; // минуты

    // Если звонок успешен - помечаем как завершенный
    if (outcome === CallOutcome.ANSWERED) {
      await this.contactRepo.update(contact.id, {
        status: ContactStatus.COMPLETED,
      });
      return;
    }

    // Если достигли максимума попыток - помечаем как failed
    if (contact.attempts >= maxAttempts) {
      await this.contactRepo.update(contact.id, {
        status: ContactStatus.FAILED,
      });
      return;
    }

    // Иначе планируем повторную попытку
    const nextAttempt = new Date();
    nextAttempt.setMinutes(nextAttempt.getMinutes() + retryInterval);

    await this.contactRepo.update(contact.id, {
      status,
      nextAttemptAt: nextAttempt,
    });
  }

  /**
   * Обработка неудачного звонка
   */
  private async handleCallFailure(contact: OutboundCampaignContact, reason: string) {
    const campaign = await this.campaignRepo.findOne({
      where: { id: contact.campaignId },
    });

    if (!campaign) return;

    const maxAttempts = campaign.settings.maxAttempts || 3;
    const retryInterval = campaign.settings.retryInterval || 15;

    if (contact.attempts >= maxAttempts) {
      await this.contactRepo.update(contact.id, {
        status: ContactStatus.FAILED,
      });
    } else {
      const nextAttempt = new Date();
      nextAttempt.setMinutes(nextAttempt.getMinutes() + retryInterval);

      await this.contactRepo.update(contact.id, {
        status: ContactStatus.FAILED,
        nextAttemptAt: nextAttempt,
      });
    }

    // Создаем запись о неудачном звонке
    await this.callRepo.save({
      campaignId: campaign.id,
      contactId: contact.id,
      outcome: CallOutcome.FAILED,
      duration: 0,
      waitTime: 0,
      notes: reason,
      createdAt: new Date(),
    });
  }

  /**
   * Проверка расписания кампании
   */
  private isInSchedule(campaign: OutboundCampaign): boolean {
    if (!campaign.schedules || campaign.schedules.length === 0) {
      return true; // Нет расписания - работаем всегда
    }

    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Проверяем, есть ли активное расписание для текущего дня
    const todaySchedules = campaign.schedules.filter(
      (schedule) => schedule.dayOfWeek === dayOfWeek && schedule.enabled !== false,
    );

    if (todaySchedules.length === 0) {
      return false; // Нет расписания на сегодня
    }

    // Проверяем, попадаем ли в временной интервал
    return todaySchedules.some((schedule) => {
      return currentTime >= schedule.startTime && currentTime <= schedule.endTime;
    });
  }

  /**
   * Получение статистики активных звонков
   */
  getActiveCallsCount(): number {
    return this.activeCalls.size;
  }

  /**
   * Получение активных звонков по кампании
   */
  getCampaignActiveCallsCount(campaignId: string): number {
    return Array.from(this.activeCalls.values()).filter((contactId) =>
      contactId.startsWith(campaignId),
    ).length;
  }
}
