import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, MoreThan, LessThan, SelectQueryBuilder } from 'typeorm';
import { Lead, LeadStatus, LeadSource, LeadPriority } from './lead.entity';
import { LeadActivity, ActivityType } from './entities/lead-activity.entity';
import { LeadScoringService } from './services/lead-scoring.service';
import { LeadDistributionService } from './services/lead-distribution.service';
import { UserService } from '../user/user.service';

export interface LeadFilters {
  status?: LeadStatus[];
  source?: LeadSource[];
  priority?: LeadPriority[];
  assignedTo?: string[];
  scoreMin?: number;
  scoreMax?: number;
  estimatedValueMin?: number;
  estimatedValueMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  tags?: string[];
  isQualified?: boolean;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasCompany?: boolean;
  search?: string; // Поиск по имени, email, телефону, компании
}

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  bySource: Record<LeadSource, number>;
  byPriority: Record<LeadPriority, number>;
  averageScore: number;
  conversionRate: number;
  totalEstimatedValue: number;
}

@Injectable()
export class LeadService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(LeadActivity)
    private readonly activityRepo: Repository<LeadActivity>,
    private readonly scoringService: LeadScoringService,
    private readonly distributionService: LeadDistributionService,
    private readonly userService: UserService
  ) {}

  async create(data: Partial<Lead>): Promise<Lead> {
    const lead = await this.leadRepo.save(data);
    
    // Записываем создание лида в активность
    await this.activityRepo.save({
      leadId: lead.id,
      type: ActivityType.NOTE_ADDED,
      title: 'Лид создан',
      description: `Новый лид создан: ${lead.name}`,
      metadata: {
        source: lead.source,
        priority: lead.priority
      }
    });

    // Автоматическое назначение лида
    if (!lead.assignedTo) {
      const assignedManager = await this.distributionService.distributeLeadAutomatically(lead.id);
      if (assignedManager) {
        lead.assignedTo = assignedManager;
      }
    }

    // Начальная оценка лида
    if (lead.source || lead.email || lead.phone) {
      await this.scoringService.calculateScore(lead.id, { lead });
    }

    return this.leadRepo.findOneBy({ id: lead.id }) || lead;
  }

  async findAll(filters?: LeadFilters, page = 1, limit = 50): Promise<{
    leads: Lead[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.leadRepo.createQueryBuilder('lead');

    // Применяем фильтры
    if (filters) {
      this.applyFilters(queryBuilder, filters);
    }

    // Подсчитываем общее количество
    const total = await queryBuilder.getCount();

    // Применяем пагинацию
    const leads = await queryBuilder
      .orderBy('lead.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  private applyFilters(queryBuilder: SelectQueryBuilder<Lead>, filters: LeadFilters): void {
    if (filters.status && filters.status.length > 0) {
      queryBuilder.andWhere('lead.status IN (:...statuses)', { statuses: filters.status });
    }

    if (filters.source && filters.source.length > 0) {
      queryBuilder.andWhere('lead.source IN (:...sources)', { sources: filters.source });
    }

    if (filters.priority && filters.priority.length > 0) {
      queryBuilder.andWhere('lead.priority IN (:...priorities)', { priorities: filters.priority });
    }

    if (filters.assignedTo && filters.assignedTo.length > 0) {
      queryBuilder.andWhere('lead.assignedTo IN (:...managers)', { managers: filters.assignedTo });
    }

    if (filters.scoreMin !== undefined) {
      queryBuilder.andWhere('lead.score >= :scoreMin', { scoreMin: filters.scoreMin });
    }

    if (filters.scoreMax !== undefined) {
      queryBuilder.andWhere('lead.score <= :scoreMax', { scoreMax: filters.scoreMax });
    }

    if (filters.estimatedValueMin !== undefined) {
      queryBuilder.andWhere('lead.estimatedValue >= :estimatedValueMin', { 
        estimatedValueMin: filters.estimatedValueMin 
      });
    }

    if (filters.estimatedValueMax !== undefined) {
      queryBuilder.andWhere('lead.estimatedValue <= :estimatedValueMax', { 
        estimatedValueMax: filters.estimatedValueMax 
      });
    }

    if (filters.createdAfter) {
      queryBuilder.andWhere('lead.createdAt >= :createdAfter', { createdAfter: filters.createdAfter });
    }

    if (filters.createdBefore) {
      queryBuilder.andWhere('lead.createdAt <= :createdBefore', { createdBefore: filters.createdBefore });
    }

    if (filters.isQualified !== undefined) {
      queryBuilder.andWhere('lead.isQualified = :isQualified', { isQualified: filters.isQualified });
    }

    if (filters.hasEmail !== undefined) {
      if (filters.hasEmail) {
        queryBuilder.andWhere('lead.email IS NOT NULL AND lead.email != \'\'');
      } else {
        queryBuilder.andWhere('(lead.email IS NULL OR lead.email = \'\')');
      }
    }

    if (filters.hasPhone !== undefined) {
      if (filters.hasPhone) {
        queryBuilder.andWhere('lead.phone IS NOT NULL AND lead.phone != \'\'');
      } else {
        queryBuilder.andWhere('(lead.phone IS NULL OR lead.phone = \'\')');
      }
    }

    if (filters.hasCompany !== undefined) {
      if (filters.hasCompany) {
        queryBuilder.andWhere('lead.company IS NOT NULL AND lead.company != \'\'');
      } else {
        queryBuilder.andWhere('(lead.company IS NULL OR lead.company = \'\')');
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      // PostgreSQL JSON операторы для поиска в массиве тегов
      for (let i = 0; i < filters.tags.length; i++) {
        queryBuilder.andWhere(`JSON_CONTAINS(lead.tags, :tag${i})`, { [`tag${i}`]: `"${filters.tags[i]}"` });
      }
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(lead.name ILIKE :search OR lead.email ILIKE :search OR lead.phone ILIKE :search OR lead.company ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }
  }

  async findById(id: number): Promise<Lead | null> {
    return this.leadRepo.findOneBy({ id });
  }

  async update(id: number, data: Partial<Lead>): Promise<Lead> {
    const existingLead = await this.findById(id);
    if (!existingLead) {
      throw new Error('Lead not found');
    }

    await this.leadRepo.update(id, data);
    
    // Записываем изменения в активность
    const changedFields = this.getChangedFields(existingLead, data);
    if (changedFields.length > 0) {
      await this.activityRepo.save({
        leadId: id,
        type: ActivityType.NOTE_ADDED,
        title: 'Лид обновлен',
        description: `Изменены поля: ${changedFields.join(', ')}`,
        metadata: { 
          changedFields: changedFields.join(','),
          hasChanges: true
        }
      });
    }

    const updatedLead = await this.findById(id);
    if (!updatedLead) {
      throw new Error('Lead not found after update');
    }

    // Если изменился статус, обновляем вероятность конверсии
    if (data.status && data.status !== existingLead.status) {
      await this.scoringService.updateConversionProbability(id);
    }

    return updatedLead;
  }

  private getChangedFields(existing: Lead, updates: Partial<Lead>): string[] {
    const changed: string[] = [];
    
    for (const [key, newValue] of Object.entries(updates)) {
      if (key in existing && existing[key as keyof Lead] !== newValue) {
        changed.push(key);
      }
    }
    
    return changed;
  }

  async assignLead(id: number, user: string): Promise<Lead> {
    const updated = await this.update(id, { assignedTo: user });
    
    // Обновляем счетчик лидов у пользователя
    const parsedUserId = Number(user);
    if (Number.isNaN(parsedUserId)) {
      // If user is not a numeric id (e.g., username), skip numeric update and just record activity.
      // Optionally, you could look up by username here if that's desired.
      // We avoid passing NaN to DB which causes QueryFailedError.
      await this.activityRepo.save({
        leadId: id,
        type: ActivityType.ASSIGNED,
        title: 'Лид назначен менеджеру',
        description: `Лид назначен менеджеру: ${user} (non-numeric id)`,
        metadata: { assignedTo: user }
      });
      return updated;
    }

    const userEntity = await this.userService.findById(parsedUserId);
    if (userEntity) {
      await this.userService.updateLeadCount(userEntity.id, 1);
    }
    
    // If we reached here, either userEntity was found and count updated, or user was numeric but not found.
    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.ASSIGNED,
      title: 'Лид назначен менеджеру',
      description: `Лид назначен менеджеру: ${user}`,
      metadata: { assignedTo: user }
    });

    return updated;
  }

  async autoAssignLead(id: number, criteria: {
    industry?: string;
    territory?: string;
    criteria: string[];
  }): Promise<Lead | null> {
    const optimalManager = await this.userService.getOptimalManagerForAssignment(criteria);
    
    if (optimalManager) {
      return await this.assignLead(id, optimalManager.id.toString());
    }
    
    return null;
  }

  async scoreLead(id: number, score: number): Promise<Lead> {
    const updated = await this.update(id, { score });
    
    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.SCORE_UPDATED,
      title: 'Обновлен скор лида',
      description: `Скор изменен на: ${score}`,
      scorePoints: score,
      metadata: { newScore: score }
    });

    return updated;
  }

  async changeStatus(id: number, status: LeadStatus): Promise<Lead> {
    const existingLead = await this.findById(id);
    if (!existingLead) {
      throw new Error('Lead not found');
    }

    const updated = await this.update(id, { status });
    
    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.STATUS_CHANGED,
      title: 'Изменен статус лида',
      description: `Статус изменен с ${existingLead.status} на ${status}`,
      metadata: { 
        oldStatus: existingLead.status, 
        newStatus: status 
      }
    });

    return updated;
  }

  async addNote(id: number, note: string, userId?: string): Promise<void> {
    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.NOTE_ADDED,
      title: 'Добавлена заметка',
      description: note,
      userId,
      metadata: { note }
    });
  }

  async logActivity(id: number, activity: Partial<LeadActivity>): Promise<LeadActivity> {
    return this.activityRepo.save({
      ...activity,
      leadId: id
    });
  }

  async getActivities(leadId: number): Promise<LeadActivity[]> {
    return this.activityRepo.find({
      where: { leadId },
      order: { createdAt: 'DESC' }
    });
  }

  async getStatistics(filters?: LeadFilters): Promise<LeadStats> {
    const queryBuilder = this.leadRepo.createQueryBuilder('lead');
    
    if (filters) {
      this.applyFilters(queryBuilder, filters);
    }

    const leads = await queryBuilder.getMany();
    
    const total = leads.length;
    const byStatus = this.groupBy(leads, 'status') as Record<LeadStatus, number>;
    const bySource = this.groupBy(leads, 'source') as Record<LeadSource, number>;
    const byPriority = this.groupBy(leads, 'priority') as Record<LeadPriority, number>;
    
    const averageScore = leads.reduce((sum, lead) => sum + lead.score, 0) / total || 0;
    const convertedCount = leads.filter(lead => lead.status === LeadStatus.CONVERTED).length;
    const conversionRate = total > 0 ? (convertedCount / total) * 100 : 0;
    const totalEstimatedValue = leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);

    return {
      total,
      byStatus,
      bySource,
      byPriority,
      averageScore: Math.round(averageScore * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalEstimatedValue
    };
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = String(item[key]);
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }

  async searchLeads(query: string, limit = 20): Promise<Lead[]> {
    return this.leadRepo.find({
      where: [
        { name: ILike(`%${query}%`) },
        { email: ILike(`%${query}%`) },
        { phone: ILike(`%${query}%`) },
        { company: ILike(`%${query}%`) }
      ],
      take: limit,
      order: { score: 'DESC' }
    });
  }

  async getLeadsByManager(managerId: string): Promise<Lead[]> {
    return this.leadRepo.find({
      where: { assignedTo: managerId },
      order: { createdAt: 'DESC' }
    });
  }

  async getHighValueLeads(minValue = 10000): Promise<Lead[]> {
    return this.leadRepo.find({
      where: {
        estimatedValue: MoreThan(minValue)
      },
      order: { estimatedValue: 'DESC' }
    });
  }

  async getStaleLeads(days = 30): Promise<Lead[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.leadRepo.find({
      where: {
        lastContactDate: LessThan(cutoffDate),
        status: LeadStatus.NEW || LeadStatus.CONTACTED
      },
      order: { lastContactDate: 'ASC' }
    });
  }

  async updateLastContact(id: number): Promise<void> {
    await this.leadRepo.update(id, { 
      lastContactDate: new Date(),
      contactAttempts: () => 'contactAttempts + 1'
    });

    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.PHONE_CALL_MADE,
      title: 'Контакт с лидом',
      description: 'Обновлена дата последнего контакта',
      metadata: { lastContactDate: new Date().toISOString() }
    });
  }

  async qualifyLead(id: number, isQualified = true): Promise<Lead> {
    const updated = await this.update(id, { 
      isQualified,
      status: isQualified ? LeadStatus.QUALIFIED : LeadStatus.NEW
    });
    
    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.STATUS_CHANGED,
      title: isQualified ? 'Лид квалифицирован' : 'Квалификация лида отменена',
      description: `Лид ${isQualified ? 'квалифицирован' : 'дисквалифицирован'}`,
      metadata: { isQualified }
    });

    return updated;
  }

  async addTags(id: number, tags: string[]): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead) {
      throw new Error('Lead not found');
    }

    const existingTags = lead.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];
    
    return this.update(id, { tags: newTags });
  }

  async removeTags(id: number, tags: string[]): Promise<Lead> {
    const lead = await this.findById(id);
    if (!lead) {
      throw new Error('Lead not found');
    }

    const existingTags = lead.tags || [];
    const newTags = existingTags.filter(tag => !tags.includes(tag));
    
    return this.update(id, { tags: newTags });
  }

  async scheduleFollowUp(id: number, date: Date, note?: string): Promise<Lead> {
    const updated = await this.update(id, { nextFollowUpDate: date });
    
    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.TASK_CREATED,
      title: 'Запланирован follow-up',
      description: note || `Follow-up запланирован на ${date.toLocaleDateString()}`,
      metadata: { followUpDate: date.toISOString(), note: note || '' }
    });

    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.leadRepo.delete(id);
    return result.affected ? result.affected > 0 : false;
  }
}
