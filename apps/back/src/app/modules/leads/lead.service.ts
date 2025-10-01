import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  ILike,
  MoreThan,
  LessThan,
  SelectQueryBuilder,
  In,
} from 'typeorm';
import { Lead, LeadStatus, LeadSource, LeadPriority } from './lead.entity';
import { LeadActivity, ActivityType } from './entities/lead-activity.entity';
import { ChangeType } from './entities/lead-history.entity';
import { LeadScoringService } from './services/lead-scoring.service';
import { LeadDistributionService } from './services/lead-distribution.service';
import { LeadHistoryService } from './services/lead-history.service';
import { UserService } from '../user/user.service';
import { Company } from '../companies/entities/company.entity';
import { Deal } from '../deals/deal.entity';
import { CreateDealDto } from '../deals/dto/create-deal.dto';
import { DealsService } from '../deals/deals.service';
import { AssignmentService } from '../shared/services/assignment.service';

// Интерфейс для создания лида с дополнительными полями
interface CreateLeadData extends Partial<Lead> {
  contactId?: string;
  companyId?: string | { id: string; [key: string]: unknown };
}

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
    @InjectRepository(Deal)
    private readonly dealRepo: Repository<Deal>,
    private readonly scoringService: LeadScoringService,
    private readonly distributionService: LeadDistributionService,
    private readonly historyService: LeadHistoryService,
    private readonly userService: UserService,
    private readonly dealsService: DealsService,
    private readonly assignmentService: AssignmentService
  ) {}

  async create(data: CreateLeadData, userId?: string, userName?: string): Promise<Lead> {
    console.log('Creating lead with data:', data);
    
    // Подготавливаем данные для сохранения
    const { companyId, ...leadDataWithoutCompanyId } = data;
    const leadData: Partial<Lead> = leadDataWithoutCompanyId;
    
    // Если передан companyId, устанавливаем связь с компанией
    if (companyId) {
      // Обрабатываем случай, когда companyId может быть объектом или строкой
      const actualCompanyId = typeof companyId === 'string' ? companyId : companyId.id;
      if (actualCompanyId) {
        leadData.company = { id: actualCompanyId } as Company;
      }
    }
    
    const lead = await this.leadRepo.save(leadData);

    // Загружаем полные данные лида с компанией
    const fullLead = await this.leadRepo.findOne({
      where: { id: lead.id },
      relations: ['company']
    });

    // Записываем создание лида в историю
    await this.historyService.createHistoryEntry({
      leadId: lead.id,
      changeType: ChangeType.CREATED,
      userId,
      userName,
      description: `Лид создан: ${lead.name}`,
      metadata: {
        'Источник': String(lead.source || 'Не указан'),
        'Приоритет': String(lead.priority || 'Средний'),
        'Компания': String(fullLead?.company?.name || fullLead?.company?.legalName || 'Не указана'),
        'Email': String(lead.email || 'Не указан'),
        'Телефон': String(lead.phone || 'Не указан')
      }
    });

    // Записываем создание лида в активность (для обратной совместимости)
    await this.activityRepo.save({
      leadId: lead.id,
      type: ActivityType.NOTE_ADDED,
      title: 'Лид создан',
      description: `Новый лид создан: ${lead.name}`,
      metadata: {
        'Источник': String(lead.source || 'Не указан'),
        'Приоритет': String(lead.priority || 'Средний'),
        'Компания': String(lead.company || 'Не указана'),
        'Email': String(lead.email || 'Не указан'),
        'Телефон': String(lead.phone || 'Не указан')
      },
    });

    // Автоматическое назначение лида
    const currentAssignments = await this.assignmentService.getCurrentAssignments('lead', lead.id.toString());
    if (currentAssignments.length === 0) {
      const assignedManager =
        await this.distributionService.distributeLeadAutomatically(lead.id);
      if (assignedManager) {
        await this.assignmentService.createAssignment({
          entityType: 'lead',
          entityId: lead.id.toString(),
          assignedTo: [Number(assignedManager)],
          assignedBy: 1, // system user
          reason: 'Auto-assigned during lead creation',
          notifyAssignees: false
        });
      }
    }

    // Начальная оценка лида
    if (lead.source || lead.email || lead.phone) {
      await this.scoringService.calculateScore(lead.id, { lead });
    }

    return fullLead || lead;
  }

  async findAll(
    filters?: LeadFilters,
    page = 1,
    limit = 50
  ): Promise<{
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
      .leftJoinAndSelect('lead.company', 'company')
      .orderBy('lead.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Lead>,
    filters: LeadFilters
  ): void {
    if (filters.status && filters.status.length > 0) {
      queryBuilder.andWhere('lead.status IN (:...statuses)', {
        statuses: filters.status,
      });
    }

    if (filters.source && filters.source.length > 0) {
      queryBuilder.andWhere('lead.source IN (:...sources)', {
        sources: filters.source,
      });
    }

    if (filters.priority && filters.priority.length > 0) {
      queryBuilder.andWhere('lead.priority IN (:...priorities)', {
        priorities: filters.priority,
      });
    }

    if (filters.assignedTo && filters.assignedTo.length > 0) {
      // Фильтрация по назначениям через join с assignment таблицей
      queryBuilder
        .innerJoin('assignments', 'assignment', 'assignment.entity_id = CAST(lead.id AS TEXT) AND assignment.entity_type = :entityType AND assignment.status = :status', {
          entityType: 'lead',
          status: 'active'
        })
        .andWhere('assignment.user_id IN (:...managers)', {
          managers: filters.assignedTo.map(id => Number(id)),
        });
    }

    if (filters.scoreMin !== undefined) {
      queryBuilder.andWhere('lead.score >= :scoreMin', {
        scoreMin: filters.scoreMin,
      });
    }

    if (filters.scoreMax !== undefined) {
      queryBuilder.andWhere('lead.score <= :scoreMax', {
        scoreMax: filters.scoreMax,
      });
    }

    if (filters.estimatedValueMin !== undefined) {
      queryBuilder.andWhere('lead.estimatedValue >= :estimatedValueMin', {
        estimatedValueMin: filters.estimatedValueMin,
      });
    }

    if (filters.estimatedValueMax !== undefined) {
      queryBuilder.andWhere('lead.estimatedValue <= :estimatedValueMax', {
        estimatedValueMax: filters.estimatedValueMax,
      });
    }

    if (filters.createdAfter) {
      queryBuilder.andWhere('lead.createdAt >= :createdAfter', {
        createdAfter: filters.createdAfter,
      });
    }

    if (filters.createdBefore) {
      queryBuilder.andWhere('lead.createdAt <= :createdBefore', {
        createdBefore: filters.createdBefore,
      });
    }

    if (filters.isQualified !== undefined) {
      queryBuilder.andWhere('lead.isQualified = :isQualified', {
        isQualified: filters.isQualified,
      });
    }

    if (filters.hasEmail !== undefined) {
      if (filters.hasEmail) {
        queryBuilder.andWhere("lead.email IS NOT NULL AND lead.email != ''");
      } else {
        queryBuilder.andWhere("(lead.email IS NULL OR lead.email = '')");
      }
    }

    if (filters.hasPhone !== undefined) {
      if (filters.hasPhone) {
        queryBuilder.andWhere("lead.phone IS NOT NULL AND lead.phone != ''");
      } else {
        queryBuilder.andWhere("(lead.phone IS NULL OR lead.phone = '')");
      }
    }

    if (filters.hasCompany !== undefined) {
      if (filters.hasCompany) {
        queryBuilder.andWhere(
          "lead.company IS NOT NULL AND lead.company != ''"
        );
      } else {
        queryBuilder.andWhere("(lead.company IS NULL OR lead.company = '')");
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      // PostgreSQL JSON операторы для поиска в массиве тегов
      for (let i = 0; i < filters.tags.length; i++) {
        queryBuilder.andWhere(`JSON_CONTAINS(lead.tags, :tag${i})`, {
          [`tag${i}`]: `"${filters.tags[i]}"`,
        });
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
    return this.leadRepo.findOne({
      where: { id },
      relations: ['company', 'deals'],
    });
  }

  async update(id: number, data: Partial<Lead>, userId?: string, userName?: string): Promise<Lead> {
    const existingLead = await this.findById(id);
    if (!existingLead) {
      throw new Error('Lead not found');
    }

    // Проверяем, если пытаются изменить статус и лид находится в финальном состоянии
    if (data.status && data.status !== existingLead.status) {
      const finalStatuses = [LeadStatus.CONVERTED, LeadStatus.REJECTED, LeadStatus.LOST];
      if (finalStatuses.includes(existingLead.status)) {
        throw new Error(`Нельзя изменить статус лида в состоянии "${existingLead.status}". Лид находится в финальном состоянии.`);
      }
    }

    // Сохраняем старые значения для записи в историю
    const oldValues = { ...existingLead };

    // Создаем safe update объект без вложенных relations
    const updateData = { ...data };
    delete (updateData as any).company;
    delete (updateData as any).contact;
    delete (updateData as any).assignedToUser;
    delete (updateData as any).deals;

    await this.leadRepo.update(id, updateData as any);

    // Записываем изменения в историю для каждого поля
    const changedFields = this.getChangedFields(existingLead, data);
    for (const fieldName of changedFields) {
      const oldValue = oldValues[fieldName as keyof Lead];
      const newValue = data[fieldName as keyof Lead];
      
      await this.historyService.createHistoryEntry({
        leadId: id,
        fieldName,
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null,
        changeType: ChangeType.UPDATED,
        userId,
        userName,
        description: `Изменено поле "${fieldName}": ${oldValue} → ${newValue}`,
        metadata: {
          'Поле': fieldName,
          'Старое значение': String(oldValue || 'Не указано'),
          'Новое значение': String(newValue || 'Не указано'),
          'Дата изменения': new Date().toLocaleDateString('ru-RU')
        }
      });
    }

    // Записываем изменения в активность (для обратной совместимости)
    if (changedFields.length > 0) {
      await this.activityRepo.save({
        leadId: id,
        type: ActivityType.NOTE_ADDED,
        title: 'Лид обновлен',
        description: `Изменены поля: ${changedFields.join(', ')}`,
        metadata: {
          'Измененные поля': changedFields.join(', '),
          'Количество изменений': changedFields.length.toString(),
          'Дата изменения': new Date().toLocaleDateString('ru-RU')
        },
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

  async assignLead(id: number, user: string, assignedByUserId?: number, assignedByUserName?: string): Promise<Lead> {
    const existingLead = await this.findById(id);
    if (!existingLead) {
      throw new Error('Lead not found');
    }

    // Получаем текущие назначения
    const currentAssignments = await this.assignmentService.getCurrentAssignments('lead', id.toString());
    const oldAssignedTo = currentAssignments.length > 0 ? currentAssignments[0].userId.toString() : null;

    // Если пользователь уже назначен, ничего не делаем
    if (oldAssignedTo === user) {
      return existingLead;
    }

    // Получаем ID пользователя для назначения
    let userId: number;
    const parsedUserId = Number(user);
    if (!Number.isNaN(parsedUserId)) {
      userId = parsedUserId;
    } else {
      // Если user - это username, ищем пользователя
      const userEntity = await this.userService.findByUsername(user);
      if (!userEntity) {
        throw new Error(`User not found: ${user}`);
      }
      userId = userEntity.id;
    }

    // Снимаем предыдущее назначение через AssignmentService
    if (currentAssignments.length > 0) {
      try {
        await this.assignmentService.removeAssignment({
          entityType: 'lead',
          entityId: id.toString(),
          userIds: currentAssignments.map(a => a.userId),
          reason: 'Reassigned to another user'
        });
      } catch (error) {
        // Игнорируем ошибки снятия назначения, если записи нет
        console.warn('Failed to remove old assignment:', error.message);
      }
    }

    // Создаем новое назначение через AssignmentService
    const assignmentResult = await this.assignmentService.createAssignment({
      entityType: 'lead',
      entityId: id.toString(),
      assignedTo: [userId],
      assignedBy: assignedByUserId,
      reason: 'Lead assigned to manager',
      notifyAssignees: false // Отключаем уведомления, так как это внутреннее действие
    });

    // Записываем назначение в историю
    await this.historyService.createHistoryEntry({
      leadId: id,
      fieldName: 'assignedTo',
      oldValue: oldAssignedTo || null,
      newValue: user,
      changeType: ChangeType.ASSIGNED,
      userId: assignedByUserId?.toString(),
      userName: assignedByUserName,
      description: `Лид назначен менеджеру: ${user}`,
      metadata: { 
        'Назначен менеджеру': String(user),
        'Предыдущий менеджер': String(oldAssignedTo || 'Не назначен'),
        'Дата назначения': new Date().toLocaleDateString('ru-RU')
      }
    });

    // Обновляем счетчик лидов у пользователя
    const userEntity = await this.userService.findById(userId);
    if (userEntity) {
      await this.userService.updateLeadCount(userEntity.id, 1);
    }

    // Записываем активность
    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.ASSIGNED,
      title: 'Лид назначен менеджеру',
      description: `Лид назначен менеджеру: ${user}`,
      metadata: { 
        'Назначен менеджеру': String(user),
        'Дата назначения': new Date().toLocaleDateString('ru-RU')
      },
    });

    return existingLead;
  }

  async autoAssignLead(
    id: number,
    criteria: {
      industry?: string;
      territory?: string;
      criteria: string[];
    }
  ): Promise<Lead | null> {
    const optimalManager =
      await this.userService.getOptimalManagerForAssignment(criteria);

    if (optimalManager) {
      return await this.assignLead(id, optimalManager.id.toString());
    }

    return null;
  }

  async scoreLead(id: number, score: number, userId?: string, userName?: string): Promise<Lead> {
    const existingLead = await this.findById(id);
    const oldScore = existingLead?.score || 0;
    
    const updated = await this.update(id, { score }, userId, userName);

    // Записываем изменение скора в историю
    await this.historyService.createHistoryEntry({
      leadId: id,
      fieldName: 'score',
      oldValue: String(oldScore),
      newValue: String(score),
      changeType: ChangeType.SCORED,
      userId,
      userName,
      description: `Скор изменен с ${oldScore} на ${score}`,
      metadata: { 
        'Старый скор': oldScore.toString(),
        'Новый скор': score.toString(),
        'Изменение': (score - oldScore).toString(),
        'Дата обновления': new Date().toLocaleDateString('ru-RU')
      }
    });

    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.SCORE_UPDATED,
      title: 'Обновлен скор лида',
      description: `Скор изменен на: ${score}`,
      scorePoints: score,
      metadata: { 
        'Новый скор': score.toString(),
        'Дата обновления': new Date().toLocaleDateString('ru-RU')
      },
    });

    return updated;
  }

  async changeStatus(id: number, status: LeadStatus, userId?: string, userName?: string): Promise<Lead> {
    const existingLead = await this.findById(id);
    if (!existingLead) {
      throw new Error('Lead not found');
    }

    // Проверяем, находится ли лид в финальном статусе
    const finalStatuses = [LeadStatus.CONVERTED, LeadStatus.REJECTED, LeadStatus.LOST];
    if (finalStatuses.includes(existingLead.status)) {
      throw new Error(`Нельзя изменить статус лида в состоянии "${existingLead.status}". Лид находится в финальном состоянии.`);
    }

    const oldStatus = existingLead.status;
    const updated = await this.update(id, { status }, userId, userName);

    // Записываем изменение статуса в историю
    await this.historyService.createHistoryEntry({
      leadId: id,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: status,
      changeType: ChangeType.STATUS_CHANGED,
      userId,
      userName,
      description: `Статус изменен с ${oldStatus} на ${status}`,
      metadata: {
        'Предыдущий статус': String(oldStatus),
        'Новый статус': String(status),
        'Дата изменения': new Date().toLocaleDateString('ru-RU'),
        'Время изменения': new Date().toLocaleTimeString('ru-RU')
      }
    });

    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.STATUS_CHANGED,
      title: 'Изменен статус лида',
      description: `Статус изменен с ${oldStatus} на ${status}`,
      metadata: {
        'Предыдущий статус': String(oldStatus),
        'Новый статус': String(status),
        'Дата изменения': new Date().toLocaleDateString('ru-RU'),
        'Время изменения': new Date().toLocaleTimeString('ru-RU')
      },
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
      metadata: { 
        'Заметка': String(note),
        'Дата добавления': new Date().toLocaleDateString('ru-RU'),
        'Автор': String(userId || 'Система')
      },
    });
  }

  async logActivity(
    id: number,
    activity: Partial<LeadActivity>
  ): Promise<LeadActivity> {
    return this.activityRepo.save({
      ...activity,
      leadId: id,
    });
  }

  async getActivities(leadId: number): Promise<LeadActivity[]> {
    return this.activityRepo.find({
      where: { leadId },
      order: { createdAt: 'DESC' },
    });
  }

  async getStatistics(filters?: LeadFilters): Promise<LeadStats> {
    const queryBuilder = this.leadRepo.createQueryBuilder('lead');

    if (filters) {
      this.applyFilters(queryBuilder, filters);
    }

    const leads = await queryBuilder.getMany();

    const total = leads.length;
    const byStatus = this.groupBy(leads, 'status') as Record<
      LeadStatus,
      number
    >;
    const bySource = this.groupBy(leads, 'source') as Record<
      LeadSource,
      number
    >;
    const byPriority = this.groupBy(leads, 'priority') as Record<
      LeadPriority,
      number
    >;

    const averageScore =
      leads.reduce((sum, lead) => sum + lead.score, 0) / total || 0;
    const convertedCount = leads.filter(
      (lead) => lead.status === LeadStatus.CONVERTED
    ).length;
    const conversionRate = total > 0 ? (convertedCount / total) * 100 : 0;
    const totalEstimatedValue = leads.reduce(
      (sum, lead) => sum + (lead.estimatedValue || 0),
      0
    );

    return {
      total,
      byStatus,
      bySource,
      byPriority,
      averageScore: Math.round(averageScore * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalEstimatedValue,
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
        { company: ILike(`%${query}%`) },
      ],
      take: limit,
      order: { score: 'DESC' },
    });
  }

  async getLeadsByManager(managerId: string): Promise<Lead[]> {
    // Получаем назначения для данного менеджера
    const assignments = await this.assignmentService.getUserAssignments(Number(managerId), {
      entityType: 'lead',
      status: 'active'
    });

    if (assignments.length === 0) {
      return [];
    }

    // Получаем лиды по ID из назначений
    const leadIds = assignments.map(a => Number(a.entityId));
    return this.leadRepo.find({
      where: { id: In(leadIds) },
      order: { createdAt: 'DESC' },
    });
  }

  async getHighValueLeads(minValue = 10000): Promise<Lead[]> {
    return this.leadRepo.find({
      where: {
        estimatedValue: MoreThan(minValue),
      },
      order: { estimatedValue: 'DESC' },
    });
  }

  async getStaleLeads(days = 30): Promise<Lead[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.leadRepo.find({
      where: {
        lastContactDate: LessThan(cutoffDate),
        status: LeadStatus.NEW || LeadStatus.CONTACTED,
      },
      order: { lastContactDate: 'ASC' },
    });
  }

  async updateLastContact(id: number): Promise<void> {
    await this.leadRepo.update(id, {
      lastContactDate: new Date(),
      contactAttempts: () => 'contactAttempts + 1',
    });

    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.PHONE_CALL_MADE,
      title: 'Контакт с лидом',
      description: 'Обновлена дата последнего контакта',
      metadata: { 
        'Дата контакта': new Date().toLocaleDateString('ru-RU'),
        'Время контакта': new Date().toLocaleTimeString('ru-RU')
      },
    });
  }

  async qualifyLead(id: number, isQualified = true, userId?: string, userName?: string): Promise<Lead> {
    const existingLead = await this.findById(id);
    const oldIsQualified = existingLead?.isQualified || false;
    
    const updated = await this.update(id, {
      isQualified,
      status: isQualified ? LeadStatus.QUALIFIED : LeadStatus.NEW,
    }, userId, userName);

    // Записываем квалификацию в историю
    await this.historyService.createHistoryEntry({
      leadId: id,
      fieldName: 'isQualified',
      oldValue: String(oldIsQualified),
      newValue: String(isQualified),
      changeType: ChangeType.QUALIFIED,
      userId,
      userName,
      description: `Лид ${isQualified ? 'квалифицирован' : 'дисквалифицирован'}`,
      metadata: { 
        'Квалифицирован': isQualified ? 'Да' : 'Нет',
        'Предыдущий статус': oldIsQualified ? 'Квалифицирован' : 'Не квалифицирован',
        'Дата квалификации': new Date().toLocaleDateString('ru-RU')
      }
    });

    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.STATUS_CHANGED,
      title: isQualified ? 'Лид квалифицирован' : 'Квалификация лида отменена',
      description: `Лид ${
        isQualified ? 'квалифицирован' : 'дисквалифицирован'
      }`,
      metadata: { 
        'Квалифицирован': isQualified ? 'Да' : 'Нет',
        'Дата квалификации': new Date().toLocaleDateString('ru-RU')
      },
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
    const newTags = existingTags.filter((tag) => !tags.includes(tag));

    return this.update(id, { tags: newTags });
  }

  async scheduleFollowUp(id: number, date: Date, note?: string): Promise<Lead> {
    const updated = await this.update(id, { nextFollowUpDate: date });

    await this.activityRepo.save({
      leadId: id,
      type: ActivityType.TASK_CREATED,
      title: 'Запланирован follow-up',
      description:
        note || `Follow-up запланирован на ${date.toLocaleDateString()}`,
      metadata: { 
        'Дата follow-up': date.toLocaleDateString('ru-RU'), 
        'Заметка': String(note || 'Нет заметки'),
        'Запланировано': new Date().toLocaleDateString('ru-RU')
      },
    });

    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.leadRepo.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Получить историю изменений лида
   */
  async getLeadHistory(
    leadId: number,
    filters?: Parameters<typeof this.historyService.getLeadHistory>[1],
    page?: number,
    limit?: number
  ) {
    return this.historyService.getLeadHistory(leadId, filters, page, limit);
  }

  /**
   * Получить статистику изменений лида
   */
  async getLeadChangeStatistics(
    leadId: number,
    dateFrom?: Date,
    dateTo?: Date
  ) {
    return this.historyService.getChangeStatistics(leadId, dateFrom, dateTo);
  }

  /**
   * Получить текущие назначения лида
   */
  async getCurrentAssignments(leadId: number) {
    return this.assignmentService.getCurrentAssignments('lead', leadId.toString());
  }

  /**
   * Конвертация лида в сделку
   * @param leadId ID лида
   * @param dealData Дополнительные данные для сделки
   * @param userId ID пользователя, выполняющего конвертацию
   * @param userName Имя пользователя, выполняющего конвертацию
   * @returns Созданная сделка
   */
  async convertToDeal(
    leadId: number, 
    dealData: {
      title?: string;
      amount: number;
      currency?: string;
      probability?: number;
      expectedCloseDate: Date;
      stageId: string;
      notes?: string;
    },
    userId?: string,
    userName?: string
  ): Promise<Deal> {
    const lead = await this.findById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    const oldStatus = lead.status;

    // Получаем текущие назначения лида
    const currentAssignments = await this.assignmentService.getCurrentAssignments('lead', leadId.toString());
    const assignedTo = currentAssignments.length > 0 ? currentAssignments[0].userId.toString() : 'unknown';

    // Создаем сделку на основе данных лида
    const dealDto: CreateDealDto = {
      title: dealData.title || `Deal from ${lead.name}`,
      leadId: lead.id,
      amount: dealData.amount,
      currency: dealData.currency || 'RUB',
      probability: dealData.probability || lead.conversionProbability || 50,
      expectedCloseDate: dealData.expectedCloseDate.toISOString(),
      stageId: dealData.stageId,
      assignedTo: assignedTo,
      notes: dealData.notes || `Converted from lead #${lead.id}: ${lead.name}`,
      meta: {
        convertedFromLead: true,
        'Конвертирован из лида': 'Да',
        'ID лида': lead.id,
        'Источник лида': lead.source || 'Не указан',
        'Приоритет лида': lead.priority || 'Средний',
        'Оценка лида': lead.score || 0,
        'Дата конвертации': new Date().toLocaleDateString('ru-RU'),
        'Компания': lead.company || 'Не указана',
        'Отрасль': lead.industry || 'Не указана',
        'Бюджет лида': lead.budget || 'Не указан',
        'Временные рамки': lead.decisionTimeframe || 'Не указаны'
      }
    };

    // Создаем сделку через DealsService для правильного связывания
    const savedDeal = await this.dealsService.createDeal(dealDto, userId, userName);

    // Обновляем статус лида на "CONVERTED"
    await this.update(leadId, { 
      status: LeadStatus.CONVERTED,
      isQualified: true 
    }, userId, userName);

    // Записываем конвертацию в историю
    await this.historyService.createHistoryEntry({
      leadId: leadId,
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: LeadStatus.CONVERTED,
      changeType: ChangeType.CONVERTED,
      userId,
      userName,
      description: `Лид конвертирован в сделку #${savedDeal.id} "${savedDeal.title}"`,
      metadata: {
        'ID сделки': savedDeal.id,
        'Название сделки': savedDeal.title,
        'Сумма сделки': `${savedDeal.amount} ${savedDeal.currency}`,
        'Вероятность': `${savedDeal.probability}%`,
        'Дата конвертации': new Date().toLocaleDateString('ru-RU'),
        'Время конвертации': new Date().toLocaleTimeString('ru-RU')
      }
    });

    // Записываем активность конвертации
    await this.activityRepo.save({
      leadId: leadId,
      type: ActivityType.STATUS_CHANGED,
      title: 'Лид конвертирован в сделку',
      description: `Лид успешно конвертирован в сделку #${savedDeal.id} "${savedDeal.title}"`,
      metadata: {
        'ID сделки': savedDeal.id,
        'Название сделки': savedDeal.title,
        'Сумма сделки': `${savedDeal.amount} ${savedDeal.currency}`,
        'Дата конвертации': new Date().toLocaleDateString('ru-RU'),
        'Время конвертации': new Date().toLocaleTimeString('ru-RU')
      }
    });

    // Возвращаем сделку с полными данными (включая связи)
    const dealWithRelations = await this.dealRepo.findOne({
      where: { id: savedDeal.id },
      relations: ['lead', 'stage']
    });
    
    return dealWithRelations || savedDeal;
  }
}
