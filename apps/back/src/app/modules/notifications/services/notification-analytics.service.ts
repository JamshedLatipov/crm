import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsMessage, MessageStatus } from '../../sms/entities/sms-message.entity';
import { EmailMessage, EmailStatus } from '../../sms/entities/email-message.entity';
import { NotificationCampaign, NotificationChannelType } from '../../sms/entities/notification-campaign.entity';
import { NotificationAnalytics, NotificationMetricType } from '../../shared/entities/notification-analytics.entity';

export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

export interface DashboardStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
}

export interface ChannelStats {
  name: string;
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
}

export interface CampaignStats {
  id: string;
  name: string;
  sent: number;
  deliveryRate: number;
}

@Injectable()
export class NotificationAnalyticsService {
  constructor(
    @InjectRepository(SmsMessage)
    private smsMessageRepository: Repository<SmsMessage>,
    @InjectRepository(EmailMessage)
    private emailMessageRepository: Repository<EmailMessage>,
    @InjectRepository(NotificationCampaign)
    private campaignRepository: Repository<NotificationCampaign>,
    @InjectRepository(NotificationAnalytics)
    private analyticsRepository: Repository<NotificationAnalytics>
  ) {}

  /**
   * Получение общей статистики панели управления
   * Использует таблицы sms_messages и email_messages
   */
  async getDashboardStats(dateRange?: AnalyticsDateRange): Promise<DashboardStats> {
    let smsQuery = this.smsMessageRepository.createQueryBuilder('sms');
    let emailQuery = this.emailMessageRepository.createQueryBuilder('email');

    if (dateRange) {
      smsQuery = smsQuery.where('sms.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      emailQuery = emailQuery.where('email.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    const [smsTotal, smsDelivered, smsFailed, smsPending] = await Promise.all([
      smsQuery.clone().getCount(),
      smsQuery.clone().andWhere('sms.status = :status', { status: MessageStatus.DELIVERED }).getCount(),
      smsQuery.clone().andWhere('sms.status = :status', { status: MessageStatus.FAILED }).getCount(),
      smsQuery.clone().andWhere('sms.status IN (:...statuses)', { statuses: [MessageStatus.PENDING, MessageStatus.QUEUED] }).getCount(),
    ]);

    const [emailTotal, emailDelivered, emailFailed, emailPending] = await Promise.all([
      emailQuery.clone().getCount(),
      emailQuery.clone().andWhere('email.status = :status', { status: EmailStatus.DELIVERED }).getCount(),
      emailQuery.clone().andWhere('email.status = :status', { status: EmailStatus.FAILED }).getCount(),
      emailQuery.clone().andWhere('email.status IN (:...statuses)', { statuses: [EmailStatus.PENDING, EmailStatus.QUEUED] }).getCount(),
    ]);

    const total = smsTotal + emailTotal;
    const delivered = smsDelivered + emailDelivered;
    const failed = smsFailed + emailFailed;
    const pending = smsPending + emailPending;
    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;

    return {
      total,
      delivered,
      failed,
      pending,
      deliveryRate,
    };
  }

  /**
   * Статистика по каналам (SMS и Email)
   */
  async getChannelStats(dateRange?: AnalyticsDateRange): Promise<ChannelStats[]> {
    const channelStats: ChannelStats[] = [];

    // SMS статистика
    let smsQuery = this.smsMessageRepository.createQueryBuilder('sms');
    if (dateRange) {
      smsQuery = smsQuery.where('sms.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    const smsStats = await smsQuery
      .select('COUNT(*)', 'sent')
      .addSelect('SUM(CASE WHEN sms.status = :delivered THEN 1 ELSE 0 END)', 'delivered')
      .addSelect('SUM(CASE WHEN sms.status = :failed THEN 1 ELSE 0 END)', 'failed')
      .setParameter('delivered', MessageStatus.DELIVERED)
      .setParameter('failed', MessageStatus.FAILED)
      .getRawOne();

    const smsSent = parseInt(smsStats?.sent || '0');
    const smsDelivered = parseInt(smsStats?.delivered || '0');
    const smsFailed = parseInt(smsStats?.failed || '0');

    // Всегда добавляем SMS канал
    channelStats.push({
      name: 'SMS',
      sent: smsSent,
      delivered: smsDelivered,
      failed: smsFailed,
      deliveryRate: smsSent > 0 ? (smsDelivered / smsSent) * 100 : 0,
    });

    // Email статистика
    let emailQuery = this.emailMessageRepository.createQueryBuilder('email');
    if (dateRange) {
      emailQuery = emailQuery.where('email.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    const emailStats = await emailQuery
      .select('COUNT(*)', 'sent')
      .addSelect('SUM(CASE WHEN email.status = :delivered THEN 1 ELSE 0 END)', 'delivered')
      .addSelect('SUM(CASE WHEN email.status = :failed THEN 1 ELSE 0 END)', 'failed')
      .setParameter('delivered', EmailStatus.DELIVERED)
      .setParameter('failed', EmailStatus.FAILED)
      .getRawOne();

    const emailSent = parseInt(emailStats?.sent || '0');
    const emailDelivered = parseInt(emailStats?.delivered || '0');
    const emailFailed = parseInt(emailStats?.failed || '0');

    // Всегда добавляем Email канал
    channelStats.push({
      name: 'Email',
      sent: emailSent,
      delivered: emailDelivered,
      failed: emailFailed,
      deliveryRate: emailSent > 0 ? (emailDelivered / emailSent) * 100 : 0,
    });

    return channelStats;
  }

  /**
   * Топ кампаний по производительности
   * Использует notification_campaigns
   */
  async getTopCampaigns(limit: number = 5, dateRange?: AnalyticsDateRange): Promise<CampaignStats[]> {
    let query = this.smsMessageRepository.createQueryBuilder('sms')
      .innerJoin('sms.campaign', 'campaign')
      .where('sms.campaign IS NOT NULL');

    if (dateRange) {
      query = query.andWhere('sms.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    const stats = await query
      .select('campaign.id', 'id')
      .addSelect('campaign.name', 'name')
      .addSelect('COUNT(*)', 'sent')
      .addSelect('SUM(CASE WHEN sms.status = :delivered THEN 1 ELSE 0 END)', 'delivered')
      .setParameter('delivered', MessageStatus.DELIVERED)
      .groupBy('campaign.id')
      .addGroupBy('campaign.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();

    return stats.map((row) => {
      const sent = parseInt(row.sent || '0');
      const delivered = parseInt(row.delivered || '0');
      
      return {
        id: row.id || 'unknown',
        name: row.name || 'Без названия',
        sent,
        deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      };
    });
  }

  /**
   * Статистика по дням для SMS
   */
  async getStatsByDay(dateRange: AnalyticsDateRange): Promise<Array<{
    date: string;
    total: number;
    delivered: number;
    failed: number;
  }>> {
    const stats = await this.smsMessageRepository
      .createQueryBuilder('sms')
      .select("DATE(sms.createdAt)", 'date')
      .addSelect('COUNT(*)', 'total')
      .addSelect('COUNT(CASE WHEN sms.status = :delivered THEN 1 END)', 'delivered')
      .addSelect('COUNT(CASE WHEN sms.status = :failed THEN 1 END)', 'failed')
      .where('sms.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .setParameter('delivered', MessageStatus.DELIVERED)
      .setParameter('failed', MessageStatus.FAILED)
      .groupBy('DATE(sms.createdAt)')
      .orderBy('DATE(sms.createdAt)', 'ASC')
      .getRawMany();

    return stats.map((row) => ({
      date: row.date,
      total: parseInt(row.total || '0'),
      delivered: parseInt(row.delivered || '0'),
      failed: parseInt(row.failed || '0'),
    }));
  }

  /**
   * Сохранение метрики в аналитику
   */
  async saveMetric(
    metricType: NotificationMetricType,
    value: number,
    options?: {
      userId?: string;
      channel?: string;
      campaignId?: string;
      campaignName?: string;
      date?: Date;
      metadata?: Record<string, any>;
    }
  ): Promise<NotificationAnalytics> {
    const metric = this.analyticsRepository.create({
      metricType,
      value,
      date: options?.date || new Date(),
      channel: options?.channel,
      campaignId: options?.campaignId,
      campaignName: options?.campaignName,
      metadata: options?.metadata,
      user: options?.userId ? { id: options.userId } as any : null,
    });

    return this.analyticsRepository.save(metric);
  }

  /**
   * Агрегация дневных метрик для SMS и Email
   */
  async aggregateDailyMetrics(date: Date): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dateRange = { startDate: startOfDay, endDate: endOfDay };

    // Агрегация общей статистики
    const dashboardStats = await this.getDashboardStats(dateRange);
    
    await Promise.all([
      this.saveMetric(NotificationMetricType.TOTAL, dashboardStats.total, { date: startOfDay, channel: 'sms' }),
      this.saveMetric(NotificationMetricType.DELIVERED, dashboardStats.delivered, { date: startOfDay, channel: 'sms' }),
      this.saveMetric(NotificationMetricType.FAILED, dashboardStats.failed, { date: startOfDay, channel: 'sms' }),
      this.saveMetric(NotificationMetricType.PENDING, dashboardStats.pending, { date: startOfDay, channel: 'sms' }),
    ]);

    // Агрегация по каналам
    const channelStats = await this.getChannelStats(dateRange);
    
    for (const channel of channelStats) {
      await Promise.all([
        this.saveMetric(NotificationMetricType.TOTAL, channel.sent, { 
          date: startOfDay, 
          channel: channel.name 
        }),
        this.saveMetric(NotificationMetricType.DELIVERED, channel.delivered, { 
          date: startOfDay, 
          channel: channel.name 
        }),
        this.saveMetric(NotificationMetricType.FAILED, channel.failed, { 
          date: startOfDay, 
          channel: channel.name 
        }),
      ]);
    }
  }
}
