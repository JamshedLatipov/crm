import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DealHistory, DealChangeType } from '../entities/deal-history.entity';

export interface CreateDealHistoryEntryData {
  dealId: string;
  fieldName?: string;
  oldValue?: string | null;
  newValue?: string | null;
  changeType: DealChangeType;
  userId?: string;
  userName?: string;
  description?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface DealHistoryFilters {
  changeType?: DealChangeType[];
  userId?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  fieldName?: string[];
}

@Injectable()
export class DealHistoryService {
  constructor(
    @InjectRepository(DealHistory)
    private readonly historyRepo: Repository<DealHistory>
  ) {}

  /**
   * Создать запись в истории изменений сделки
   */
  async createHistoryEntry(data: CreateDealHistoryEntryData): Promise<DealHistory> {
    const historyEntry = this.historyRepo.create({
      dealId: data.dealId,
      fieldName: data.fieldName,
      oldValue: data.oldValue ? String(data.oldValue) : null,
      newValue: data.newValue ? String(data.newValue) : null,
      changeType: data.changeType,
      userId: data.userId,
      userName: data.userName,
      description: data.description,
      metadata: data.metadata || null
    });

    return this.historyRepo.save(historyEntry);
  }

  /**
   * Получить историю изменений сделки
   */
  async getDealHistory(
    dealId: string, 
    filters?: DealHistoryFilters,
    page = 1,
    limit = 50
  ): Promise<{
    history: DealHistory[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.historyRepo
      .createQueryBuilder('history')
      .where('history.dealId = :dealId', { dealId })
      .leftJoinAndSelect('history.deal', 'deal');

    // Применяем фильтры
    if (filters?.changeType && filters.changeType.length > 0) {
      queryBuilder.andWhere('history.changeType IN (:...changeTypes)', {
        changeTypes: filters.changeType
      });
    }

    if (filters?.userId && filters.userId.length > 0) {
      queryBuilder.andWhere('history.userId IN (:...userIds)', {
        userIds: filters.userId
      });
    }

    if (filters?.fieldName && filters.fieldName.length > 0) {
      queryBuilder.andWhere('history.fieldName IN (:...fieldNames)', {
        fieldNames: filters.fieldName
      });
    }

    if (filters?.dateFrom) {
      queryBuilder.andWhere('history.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom
      });
    }

    if (filters?.dateTo) {
      queryBuilder.andWhere('history.createdAt <= :dateTo', {
        dateTo: filters.dateTo
      });
    }

    // Подсчитываем общее количество
    const total = await queryBuilder.getCount();

    // Получаем записи с пагинацией
    const history = await queryBuilder
      .orderBy('history.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      history,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Получить последние изменения по всем сделкам
   */
  async getRecentChanges(
    filters?: DealHistoryFilters,
    page = 1,
    limit = 20
  ): Promise<{
    history: DealHistory[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.historyRepo
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.deal', 'deal');

    // Применяем фильтры
    if (filters?.changeType && filters.changeType.length > 0) {
      queryBuilder.andWhere('history.changeType IN (:...changeTypes)', {
        changeTypes: filters.changeType
      });
    }

    if (filters?.userId && filters.userId.length > 0) {
      queryBuilder.andWhere('history.userId IN (:...userIds)', {
        userIds: filters.userId
      });
    }

    if (filters?.dateFrom) {
      queryBuilder.andWhere('history.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom
      });
    }

    if (filters?.dateTo) {
      queryBuilder.andWhere('history.createdAt <= :dateTo', {
        dateTo: filters.dateTo
      });
    }

    // Подсчитываем общее количество
    const total = await queryBuilder.getCount();

    // Получаем записи с пагинацией
    const history = await queryBuilder
      .orderBy('history.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      history,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Получить статистику изменений по типам
   */
  async getChangeStatistics(
    dealId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Record<DealChangeType, number>> {
    const queryBuilder = this.historyRepo
      .createQueryBuilder('history')
      .select('history.changeType', 'changeType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('history.changeType');

    if (dealId) {
      queryBuilder.where('history.dealId = :dealId', { dealId });
    }

    if (dateFrom) {
      queryBuilder.andWhere('history.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('history.createdAt <= :dateTo', { dateTo });
    }

    const results = await queryBuilder.getRawMany();

    // Инициализируем все типы изменений нулями
    const statistics: Record<DealChangeType, number> = {
      [DealChangeType.CREATED]: 0,
      [DealChangeType.UPDATED]: 0,
      [DealChangeType.DELETED]: 0,
      [DealChangeType.STATUS_CHANGED]: 0,
      [DealChangeType.STAGE_MOVED]: 0,
      [DealChangeType.ASSIGNED]: 0,
      [DealChangeType.AMOUNT_CHANGED]: 0,
      [DealChangeType.PROBABILITY_CHANGED]: 0,
      [DealChangeType.WON]: 0,
      [DealChangeType.LOST]: 0,
      [DealChangeType.REOPENED]: 0,
      [DealChangeType.NOTE_ADDED]: 0,
      [DealChangeType.CONTACT_LINKED]: 0,
      [DealChangeType.COMPANY_LINKED]: 0,
      [DealChangeType.LEAD_LINKED]: 0,
      [DealChangeType.DATE_CHANGED]: 0
    };

    // Заполняем статистику из результатов запроса
    results.forEach(result => {
      const changeType = result.changeType as DealChangeType;
      statistics[changeType] = parseInt(result.count, 10);
    });

    return statistics;
  }

  /**
   * Получить активность пользователей по сделкам
   */
  async getUserActivity(
    dateFrom?: Date,
    dateTo?: Date,
    limit = 10
  ): Promise<Array<{
    userId: string;
    userName: string;
    changesCount: number;
    lastActivity: Date;
  }>> {
    const queryBuilder = this.historyRepo
      .createQueryBuilder('history')
      .select('history.userId', 'userId')
      .addSelect('history.userName', 'userName')
      .addSelect('COUNT(*)', 'changescount')
      .addSelect('MAX(history.createdAt)', 'lastActivity')
      .where('history.userId IS NOT NULL')
      .groupBy('history.userId, history.userName')
      .orderBy('changescount', 'DESC');

    if (dateFrom) {
      queryBuilder.andWhere('history.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('history.createdAt <= :dateTo', { dateTo });
    }

    const results = await queryBuilder.limit(limit).getRawMany();

    return results.map(result => ({
      userId: result.userId,
      userName: result.userName || 'Неизвестно',
      changesCount: parseInt(result.changescount, 10),
      lastActivity: new Date(result.lastActivity)
    }));
  }

  /**
   * Сравнить состояние сделки в разные моменты времени
   */
  async compareDealStates(
    dealId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<{
    changes: DealHistory[];
    fieldChanges: Record<string, { oldValue: string | null; newValue: string | null }>;
  }> {
    const changes = await this.historyRepo
      .createQueryBuilder('history')
      .where('history.dealId = :dealId', { dealId })
      .andWhere('history.createdAt >= :fromDate', { fromDate })
      .andWhere('history.createdAt <= :toDate', { toDate })
      .orderBy('history.createdAt', 'ASC')
      .getMany();

    // Группируем изменения по полям
    const fieldChanges: Record<string, { oldValue: string | null; newValue: string | null }> = {};
    
    changes.forEach(change => {
      if (change.fieldName) {
        if (!fieldChanges[change.fieldName]) {
          fieldChanges[change.fieldName] = {
            oldValue: change.oldValue,
            newValue: change.newValue
          };
        } else {
          // Обновляем только новое значение, оставляя исходное старое
          fieldChanges[change.fieldName].newValue = change.newValue;
        }
      }
    });

    return { changes, fieldChanges };
  }

  /**
   * Удалить историю изменений сделки (при удалении сделки)
   */
  async deleteDealHistory(dealId: string): Promise<void> {
    await this.historyRepo.delete({ dealId });
  }

  /**
   * Очистить старую историю (для maintenance)
   */
  async cleanupOldHistory(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.historyRepo
      .createQueryBuilder()
      .delete()
      .from(DealHistory)
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Получить статистику по этапам сделок
   */
  async getStageMovementStats(
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Array<{
    fromStage: string;
    toStage: string;
    count: number;
  }>> {
    const queryBuilder = this.historyRepo
      .createQueryBuilder('history')
      .select('history.oldValue', 'fromStage')
      .addSelect('history.newValue', 'toStage') 
      .addSelect('COUNT(*)', 'count')
      .where('history.changeType = :changeType', { changeType: DealChangeType.STAGE_MOVED })
      .andWhere('history.fieldName = :fieldName', { fieldName: 'stageId' })
      .groupBy('history.oldValue, history.newValue');

    if (dateFrom) {
      queryBuilder.andWhere('history.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('history.createdAt <= :dateTo', { dateTo });
    }

    const results = await queryBuilder.getRawMany();

    return results.map(result => ({
      fromStage: result.fromStage || 'Неизвестно',
      toStage: result.toStage || 'Неизвестно',
      count: parseInt(result.count, 10)
    }));
  }

  /**
   * Получить сделки с наибольшим количеством изменений
   */
  async getMostActiveDays(
    limit = 10,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Array<{
    dealId: string;
    dealTitle: string;
    changesCount: number;
    lastChange: Date;
  }>> {
    const queryBuilder = this.historyRepo
      .createQueryBuilder('history')
      .leftJoin('deals', 'deal', 'deal.id = history.dealId')
      .select('history.dealId', 'dealId')
      .addSelect('deal.title', 'dealTitle')
      .addSelect('COUNT(*)', 'changescount')
      .addSelect('MAX(history.createdAt)', 'lastChange')
      .groupBy('history.dealId, deal.title')
      .orderBy('changescount', 'DESC');

    if (dateFrom) {
      queryBuilder.andWhere('history.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('history.createdAt <= :dateTo', { dateTo });
    }

    const results = await queryBuilder.limit(limit).getRawMany();

    return results.map(result => ({
      dealId: result.dealId,
      dealTitle: result.dealTitle || 'Без названия',
      changesCount: parseInt(result.changescount, 10),
      lastChange: new Date(result.lastChange)
    }));
  }
}