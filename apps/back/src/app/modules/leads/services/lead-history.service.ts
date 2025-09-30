import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadHistory, ChangeType } from '../entities/lead-history.entity';

export interface CreateHistoryEntryData {
  leadId: number;
  fieldName?: string;
  oldValue?: string | null;
  newValue?: string | null;
  changeType: ChangeType;
  userId?: string;
  userName?: string;
  description?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface HistoryFilters {
  changeType?: ChangeType[];
  userId?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  fieldName?: string[];
}

@Injectable()
export class LeadHistoryService {
  constructor(
    @InjectRepository(LeadHistory)
    private readonly historyRepo: Repository<LeadHistory>
  ) {}

  /**
   * Создать запись в истории изменений
   */
  async createHistoryEntry(data: CreateHistoryEntryData): Promise<LeadHistory> {
    const historyEntry = this.historyRepo.create({
      leadId: data.leadId,
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
   * Получить историю изменений лида
   */
  async getLeadHistory(
    leadId: number, 
    filters?: HistoryFilters,
    page = 1,
    limit = 50
  ): Promise<{
    history: LeadHistory[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.historyRepo
      .createQueryBuilder('history')
      .where('history.leadId = :leadId', { leadId })
      .leftJoinAndSelect('history.lead', 'lead');

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
   * Получить последние изменения по всем лидам
   */
  async getRecentChanges(
    filters?: HistoryFilters,
    page = 1,
    limit = 20
  ): Promise<{
    history: LeadHistory[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.historyRepo
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.lead', 'lead');

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
    leadId?: number,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Record<ChangeType, number>> {
    const queryBuilder = this.historyRepo
      .createQueryBuilder('history')
      .select('history.changeType', 'changeType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('history.changeType');

    if (leadId) {
      queryBuilder.where('history.leadId = :leadId', { leadId });
    }

    if (dateFrom) {
      queryBuilder.andWhere('history.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      queryBuilder.andWhere('history.createdAt <= :dateTo', { dateTo });
    }

    const results = await queryBuilder.getRawMany();

    // Инициализируем все типы изменений нулями
    const statistics: Record<ChangeType, number> = {
      [ChangeType.CREATED]: 0,
      [ChangeType.UPDATED]: 0,
      [ChangeType.DELETED]: 0,
      [ChangeType.STATUS_CHANGED]: 0,
      [ChangeType.ASSIGNED]: 0,
      [ChangeType.SCORED]: 0,
      [ChangeType.QUALIFIED]: 0,
      [ChangeType.CONVERTED]: 0,
      [ChangeType.NOTE_ADDED]: 0,
      [ChangeType.CONTACT_ADDED]: 0,
      [ChangeType.TAG_ADDED]: 0,
      [ChangeType.TAG_REMOVED]: 0,
      [ChangeType.FOLLOW_UP_SCHEDULED]: 0
    };

    // Заполняем статистику из результатов запроса
    results.forEach(result => {
      const changeType = result.changeType as ChangeType;
      statistics[changeType] = parseInt(result.count, 10);
    });

    return statistics;
  }

  /**
   * Получить активность пользователей
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
      .addSelect('COUNT(*)', 'changesCount')
      .addSelect('MAX(history.createdAt)', 'lastActivity')
      .where('history.userId IS NOT NULL')
      .groupBy('history.userId, history.userName')
      .orderBy('changesCount', 'DESC');

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
      changesCount: parseInt(result.changesCount, 10),
      lastActivity: new Date(result.lastActivity)
    }));
  }

  /**
   * Сравнить состояние лида в разные моменты времени
   */
  async compareLeadStates(
    leadId: number,
    fromDate: Date,
    toDate: Date
  ): Promise<{
    changes: LeadHistory[];
    fieldChanges: Record<string, { oldValue: string | null; newValue: string | null }>;
  }> {
    const changes = await this.historyRepo
      .createQueryBuilder('history')
      .where('history.leadId = :leadId', { leadId })
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
   * Удалить историю изменений лида (при удалении лида)
   */
  async deleteLeadHistory(leadId: number): Promise<void> {
    await this.historyRepo.delete({ leadId });
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
      .from(LeadHistory)
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}