import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SmsMessage, MessageStatus } from '../entities/sms-message.entity';
import { SmsCampaign, CampaignStatus } from '../entities/sms-campaign.entity';
import { SmsAnalytics, MetricType } from '../entities/sms-analytics.entity';

export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

export interface DashboardStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  totalCost: number;
  activeCampaigns: number;
  completedCampaigns: number;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  cost: number;
  startedAt: Date;
  completedAt: Date;
}

@Injectable()
export class SmsAnalyticsService {
  constructor(
    @InjectRepository(SmsMessage)
    private messageRepository: Repository<SmsMessage>,
    @InjectRepository(SmsCampaign)
    private campaignRepository: Repository<SmsCampaign>,
    @InjectRepository(SmsAnalytics)
    private analyticsRepository: Repository<SmsAnalytics>
  ) {}

  /**
   * Получение общей статистики панели управления
   */
  async getDashboardStats(dateRange?: AnalyticsDateRange): Promise<DashboardStats> {
    let query = this.messageRepository.createQueryBuilder('message');

    if (dateRange) {
      query = query.where('message.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    const [totalSent, totalDelivered, totalFailed] = await Promise.all([
      query.clone().andWhere('message.status = :status', { status: MessageStatus.SENT }).getCount(),
      query.clone().andWhere('message.status = :status', { status: MessageStatus.DELIVERED }).getCount(),
      query.clone().andWhere('message.status = :status', { status: MessageStatus.FAILED }).getCount(),
    ]);

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    // Подсчитываем общую стоимость
    const costResult = await query.clone()
      .select('SUM(message.cost)', 'totalCost')
      .getRawOne();

    const totalCost = parseFloat(costResult?.totalCost || '0');

    // Количество активных и завершённых кампаний
    const [activeCampaigns, completedCampaigns] = await Promise.all([
      this.campaignRepository.count({
        where: { status: CampaignStatus.SENDING },
      }),
      this.campaignRepository.count({
        where: { status: CampaignStatus.COMPLETED },
      }),
    ]);

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      deliveryRate,
      totalCost,
      activeCampaigns,
      completedCampaigns,
    };
  }

  /**
   * Статистика по кампаниям
   */
  async getCampaignPerformance(dateRange?: AnalyticsDateRange): Promise<CampaignPerformance[]> {
    let query = this.campaignRepository.createQueryBuilder('campaign')
      .where('campaign.status = :status', { status: CampaignStatus.COMPLETED });

    if (dateRange) {
      query = query.andWhere('campaign.completedAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    const campaigns = await query
      .orderBy('campaign.completedAt', 'DESC')
      .getMany();

    return campaigns.map((campaign) => ({
      campaignId: campaign.id,
      campaignName: campaign.name,
      sent: campaign.sentCount,
      delivered: campaign.deliveredCount,
      failed: campaign.failedCount,
      deliveryRate: campaign.sentCount > 0 ? (campaign.deliveredCount / campaign.sentCount) * 100 : 0,
      cost: parseFloat(campaign.totalCost.toString()),
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
    }));
  }

  /**
   * Статистика по сообщениям за период
   */
  async getMessageStatsByDay(dateRange: AnalyticsDateRange): Promise<Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
    cost: number;
  }>> {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .select("DATE(message.createdAt)", 'date')
      .addSelect('COUNT(CASE WHEN message.status = :sent THEN 1 END)', 'sent')
      .addSelect('COUNT(CASE WHEN message.status = :delivered THEN 1 END)', 'delivered')
      .addSelect('COUNT(CASE WHEN message.status = :failed THEN 1 END)', 'failed')
      .addSelect('SUM(message.cost)', 'cost')
      .where('message.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .setParameter('sent', MessageStatus.SENT)
      .setParameter('delivered', MessageStatus.DELIVERED)
      .setParameter('failed', MessageStatus.FAILED)
      .groupBy('DATE(message.createdAt)')
      .orderBy('DATE(message.createdAt)', 'ASC')
      .getRawMany();

    return messages.map((row) => ({
      date: row.date,
      sent: parseInt(row.sent || '0'),
      delivered: parseInt(row.delivered || '0'),
      failed: parseInt(row.failed || '0'),
      cost: parseFloat(row.cost || '0'),
    }));
  }

  /**
   * Статистика по часам дня (лучшее время для отправки)
   */
  async getMessageStatsByHour(dateRange?: AnalyticsDateRange): Promise<Array<{
    hour: number;
    sent: number;
    deliveryRate: number;
  }>> {
    let query = this.messageRepository
      .createQueryBuilder('message')
      .select("EXTRACT(HOUR FROM message.sentAt)", 'hour')
      .addSelect('COUNT(*)', 'sent')
      .addSelect('SUM(CASE WHEN message.status = :delivered THEN 1 ELSE 0 END)', 'delivered')
      .where('message.sentAt IS NOT NULL')
      .setParameter('delivered', MessageStatus.DELIVERED);

    if (dateRange) {
      query = query.andWhere('message.createdAt BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }

    const stats = await query
      .groupBy('EXTRACT(HOUR FROM message.sentAt)')
      .orderBy('EXTRACT(HOUR FROM message.sentAt)', 'ASC')
      .getRawMany();

    return stats.map((row) => ({
      hour: parseInt(row.hour),
      sent: parseInt(row.sent || '0'),
      deliveryRate: row.sent > 0 ? (parseInt(row.delivered || '0') / parseInt(row.sent)) * 100 : 0,
    }));
  }

  /**
   * Топ неудачных номеров
   */
  async getTopFailedNumbers(limit: number = 10): Promise<Array<{
    phoneNumber: string;
    failedCount: number;
    lastError: string;
  }>> {
    const failed = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.phoneNumber', 'phoneNumber')
      .addSelect('COUNT(*)', 'failedCount')
      .addSelect('MAX(message.metadata)', 'lastMetadata')
      .where('message.status = :status', { status: MessageStatus.FAILED })
      .groupBy('message.phoneNumber')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();

    return failed.map((row) => ({
      phoneNumber: row.phoneNumber,
      failedCount: parseInt(row.failedCount),
      lastError: row.lastMetadata?.errorMessage || 'Unknown error',
    }));
  }

  /**
   * Сравнение кампаний
   */
  async compareCampaigns(campaignIds: string[]): Promise<Array<{
    campaignId: string;
    campaignName: string;
    totalRecipients: number;
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
    avgCost: number;
    totalCost: number;
  }>> {
    const campaigns = await this.campaignRepository
      .createQueryBuilder('campaign')
      .whereInIds(campaignIds)
      .getMany();

    const stats = await Promise.all(
      campaigns.map(async (campaign) => {
        const avgCostResult = await this.messageRepository
          .createQueryBuilder('message')
          .select('AVG(message.cost)', 'avgCost')
          .where('message.campaignId = :campaignId', { campaignId: campaign.id })
          .getRawOne();

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          totalRecipients: campaign.totalRecipients,
          sent: campaign.sentCount,
          delivered: campaign.deliveredCount,
          failed: campaign.failedCount,
          deliveryRate: campaign.sentCount > 0 ? (campaign.deliveredCount / campaign.sentCount) * 100 : 0,
          avgCost: parseFloat(avgCostResult?.avgCost || '0'),
          totalCost: parseFloat(campaign.totalCost.toString()),
        };
      })
    );

    return stats;
  }

  /**
   * Экспорт отчёта по кампании
   */
  async exportCampaignReport(campaignId: string): Promise<{
    campaign: SmsCampaign;
    messages: SmsMessage[];
    summary: {
      totalMessages: number;
      sent: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
      totalCost: number;
    };
  }> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['template', 'segment', 'createdBy'],
    });

    const messages = await this.messageRepository.find({
      where: { campaign: { id: campaignId } },
      relations: ['contact', 'lead'],
      order: { createdAt: 'DESC' },
    });

    const summary = {
      totalMessages: messages.length,
      sent: messages.filter((m) => m.status === MessageStatus.SENT).length,
      delivered: messages.filter((m) => m.status === MessageStatus.DELIVERED).length,
      failed: messages.filter((m) => m.status === MessageStatus.FAILED).length,
      deliveryRate: 0,
      totalCost: messages.reduce((sum, m) => sum + parseFloat(m.cost.toString()), 0),
    };

    summary.deliveryRate = summary.sent > 0 ? (summary.delivered / summary.sent) * 100 : 0;

    return {
      campaign,
      messages,
      summary,
    };
  }

  /**
   * Сохранение метрики в аналитику
   */
  async saveMetric(
    metricType: MetricType,
    value: number,
    metadata?: Record<string, any>,
    campaignId?: string
  ): Promise<void> {
    const analytic = this.analyticsRepository.create({
      metricType,
      value,
      metadata,
      campaign: campaignId ? { id: campaignId } as any : null,
      date: new Date(),
    });

    await this.analyticsRepository.save(analytic);
  }

  /**
   * Получение трендов метрик
   */
  async getMetricTrends(
    metricType: MetricType,
    dateRange: AnalyticsDateRange
  ): Promise<Array<{
    date: string;
    value: number;
  }>> {
    const metrics = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select("DATE(analytics.date)", 'date')
      .addSelect('SUM(analytics.value)', 'value')
      .where('analytics.metricType = :metricType', { metricType })
      .andWhere('analytics.date BETWEEN :startDate AND :endDate', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      })
      .groupBy('DATE(analytics.date)')
      .orderBy('DATE(analytics.date)', 'ASC')
      .getRawMany();

    return metrics.map((row) => ({
      date: row.date,
      value: parseFloat(row.value || '0'),
    }));
  }
}
