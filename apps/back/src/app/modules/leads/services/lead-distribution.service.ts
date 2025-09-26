import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../lead.entity';
import { LeadDistributionRule, DistributionMethod } from '../entities/lead-distribution-rule.entity';
import { LeadActivity, ActivityType } from '../entities/lead-activity.entity';

export interface DistributionContext {
  lead: Lead;
  currentHour?: number;
  currentDay?: number; // 0-6, где 0 - воскресенье
  managerLoads?: Record<string, number>; // Текущая загрузка менеджеров
}

@Injectable()
export class LeadDistributionService {
  private roundRobinCounters: Record<string, number> = {};

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(LeadDistributionRule)
    private readonly distributionRuleRepo: Repository<LeadDistributionRule>,
    @InjectRepository(LeadActivity)
    private readonly activityRepo: Repository<LeadActivity>
  ) {}

  async distributeLeadAutomatically(leadId: number, context?: Partial<DistributionContext>): Promise<string | null> {
    const lead = await this.leadRepo.findOneBy({ id: leadId });
    if (!lead) {
      throw new Error('Lead not found');
    }

    const distributionContext: DistributionContext = {
      lead,
      currentHour: context?.currentHour ?? new Date().getHours(),
      currentDay: context?.currentDay ?? new Date().getDay(),
      managerLoads: context?.managerLoads ?? await this.getManagerLoads()
    };

    const rules = await this.distributionRuleRepo.find({
      where: { isActive: true },
      order: { priority: 'DESC' }
    });

    for (const rule of rules) {
      if (this.checkRuleConditions(rule, distributionContext)) {
        const assignedManager = await this.applyDistributionRule(rule, distributionContext);
        
        if (assignedManager) {
          // Обновляем лида
          await this.leadRepo.update(leadId, { assignedTo: assignedManager });
          
          // Записываем активность
          await this.activityRepo.save({
            leadId: lead.id,
            type: ActivityType.ASSIGNED,
            title: 'Лид автоматически назначен менеджеру',
            description: `Назначен менеджеру: ${assignedManager} по правилу: ${rule.name}`,
            metadata: {
              ruleId: rule.id,
              ruleName: rule.name,
              method: rule.method,
              assignedTo: assignedManager
            }
          });

          return assignedManager;
        }
      }
    }

    return null;
  }

  private checkRuleConditions(rule: LeadDistributionRule, context: DistributionContext): boolean {
    const { lead, currentHour, currentDay } = context;

    // Проверяем рабочие часы
    if (rule.workingHoursStart && rule.workingHoursEnd && currentHour !== undefined) {
      const startHour = parseInt(rule.workingHoursStart.split(':')[0]);
      const endHour = parseInt(rule.workingHoursEnd.split(':')[0]);
      
      if (currentHour < startHour || currentHour >= endHour) {
        return false;
      }
    }

    // Проверяем рабочие дни
    if (rule.workingDays && rule.workingDays.length > 0 && currentDay !== undefined) {
      if (!rule.workingDays.includes(currentDay)) {
        return false;
      }
    }

    // Проверяем условия правила
    if (rule.conditions) {
      for (const [key, value] of Object.entries(rule.conditions)) {
        switch (key) {
          case 'source':
            if (lead.source !== value) return false;
            break;
          case 'score':
            if (typeof value === 'number' && lead.score < value) return false;
            break;
          case 'priority':
            if (lead.priority !== value) return false;
            break;
          case 'estimatedValue':
            if (typeof value === 'number' && (!lead.estimatedValue || lead.estimatedValue < value)) return false;
            break;
          case 'hasCompany':
            if (Boolean(lead.company) !== value) return false;
            break;
          default:
            // Проверка кастомных полей
            if (lead.customFields && lead.customFields[key] !== value) return false;
        }
      }
    }

    return true;
  }

  private async applyDistributionRule(rule: LeadDistributionRule, context: DistributionContext): Promise<string | null> {
    const { managerLoads } = context;
    const availableManagers = this.getAvailableManagers(rule, managerLoads);

    if (availableManagers.length === 0) {
      return null;
    }

    switch (rule.method) {
      case DistributionMethod.ROUND_ROBIN:
        return this.applyRoundRobin(rule, availableManagers);

      case DistributionMethod.LOAD_BASED:
        return this.applyLoadBased(availableManagers, managerLoads || {});

      case DistributionMethod.SKILL_BASED:
        return this.applySkillBased(rule, context);

      case DistributionMethod.GEOGRAPHIC:
        return this.applyGeographic(rule, context);

      case DistributionMethod.RANDOM:
        return this.applyRandom(availableManagers);

      case DistributionMethod.MANUAL:
        return null; // Требует ручного назначения

      default:
        return null;
    }
  }

  private getAvailableManagers(rule: LeadDistributionRule, managerLoads?: Record<string, number>): string[] {
    let availableManagers = [...rule.assignees];

    // Фильтруем менеджеров по максимальной загрузке
    if (rule.maxLeadsPerUser > 0 && managerLoads) {
      availableManagers = availableManagers.filter(
        managerId => (managerLoads[managerId] || 0) < rule.maxLeadsPerUser
      );
    }

    return availableManagers;
  }

  private applyRoundRobin(rule: LeadDistributionRule, managers: string[]): string {
    const ruleKey = `rule_${rule.id}`;
    
    if (!this.roundRobinCounters[ruleKey]) {
      this.roundRobinCounters[ruleKey] = 0;
    }

    const selectedManager = managers[this.roundRobinCounters[ruleKey] % managers.length];
    this.roundRobinCounters[ruleKey]++;

    return selectedManager;
  }

  private applyLoadBased(managers: string[], managerLoads: Record<string, number>): string {
    // Находим менеджера с наименьшей загрузкой
    return managers.reduce((minManager, manager) => {
      const currentLoad = managerLoads[manager] || 0;
      const minLoad = managerLoads[minManager] || 0;
      return currentLoad < minLoad ? manager : minManager;
    });
  }

  private applySkillBased(rule: LeadDistributionRule, context: DistributionContext): string | null {
    const { lead } = context;
    
    // Простая логика на основе веса для разных типов лидов
    if (!rule.weights) {
      return null;
    }

    const candidates: Array<{ managerId: string; weight: number }> = [];

    for (const [managerId, weight] of Object.entries(rule.weights)) {
      let adjustedWeight = weight;

      // Корректируем вес на основе характеристик лида
      if (lead.source === 'website') adjustedWeight *= 1.2;
      if (lead.score > 50) adjustedWeight *= 1.3;
      if (lead.estimatedValue && lead.estimatedValue > 10000) adjustedWeight *= 1.5;

      candidates.push({ managerId, weight: adjustedWeight });
    }

    // Выбираем менеджера с наибольшим весом
    const bestCandidate = candidates.reduce((best, candidate) => 
      candidate.weight > best.weight ? candidate : best
    );

    return bestCandidate.managerId;
  }

  private applyGeographic(rule: LeadDistributionRule, context: DistributionContext): string | null {
    // Простая географическая логика
    // В реальности можно использовать IP геолокацию или указанный адрес
    const { lead } = context;
    
    if (!rule.weights) {
      return null;
    }

    // Можно расширить логику на основе часовых поясов, регионов и т.д.
    const phone = lead.phone || '';
    
    // Простая логика по коду страны в телефоне
    if (phone.startsWith('+7') || phone.startsWith('8')) {
      // Россия
      return this.findManagerByRegion(rule.weights);
    } else if (phone.startsWith('+1')) {
      // США
      return this.findManagerByRegion(rule.weights);
    }

    return null;
  }

  private findManagerByRegion(weights: Record<string, number>): string | null {
    for (const [managerId, weight] of Object.entries(weights)) {
      // В реальности здесь была бы проверка региона менеджера
      if (weight > 0) {
        return managerId;
      }
    }
    return null;
  }

  private applyRandom(managers: string[]): string {
    const randomIndex = Math.floor(Math.random() * managers.length);
    return managers[randomIndex];
  }

  private async getManagerLoads(): Promise<Record<string, number>> {
    const loads: Record<string, number> = {};
    
    // Подсчитываем активные лиды для каждого менеджера
    const activeLeads = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.assignedTo')
      .addSelect('COUNT(*)', 'count')
      .where('lead.assignedTo IS NOT NULL')
      .andWhere('lead.status NOT IN (:...closedStatuses)', { 
        closedStatuses: ['converted', 'rejected', 'lost'] 
      })
      .groupBy('lead.assignedTo')
      .getRawMany();

    for (const result of activeLeads) {
      loads[result.lead_assignedTo] = parseInt(result.count);
    }

    return loads;
  }

  async reassignLead(leadId: number, newManagerId: string, reason?: string): Promise<boolean> {
    const lead = await this.leadRepo.findOneBy({ id: leadId });
    if (!lead) {
      return false;
    }

    const oldManager = lead.assignedTo;
    await this.leadRepo.update(leadId, { assignedTo: newManagerId });

    // Записываем активность
    await this.activityRepo.save({
      leadId: lead.id,
      type: ActivityType.ASSIGNED,
      title: 'Лид переназначен',
      description: `Переназначен с ${oldManager || 'неназначен'} на ${newManagerId}${reason ? `. Причина: ${reason}` : ''}`,
      metadata: {
        oldManager,
        newManager: newManagerId,
        reason: reason || 'manual'
      }
    });

    return true;
  }

  async getManagerStatistics(managerId: string): Promise<{
    totalLeads: number;
    activeLeads: number;
    convertedLeads: number;
    conversionRate: number;
    averageScore: number;
  }> {
    const stats = await this.leadRepo
      .createQueryBuilder('lead')
      .select([
        'COUNT(*) as totalLeads',
        'COUNT(CASE WHEN lead.status NOT IN (\'converted\', \'rejected\', \'lost\') THEN 1 END) as activeLeads',
        'COUNT(CASE WHEN lead.status = \'converted\' THEN 1 END) as convertedLeads',
        'AVG(lead.score) as averageScore'
      ])
      .where('lead.assignedTo = :managerId', { managerId })
      .getRawOne();

    const totalLeads = parseInt(stats.totalLeads) || 0;
    const convertedLeads = parseInt(stats.convertedLeads) || 0;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      activeLeads: parseInt(stats.activeLeads) || 0,
      convertedLeads,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageScore: Math.round((parseFloat(stats.averageScore) || 0) * 100) / 100
    };
  }

  async getDefaultDistributionRules(): Promise<Partial<LeadDistributionRule>[]> {
    return [
      {
        name: 'Default Round Robin',
        description: 'Распределение всех лидов по кругу',
        method: DistributionMethod.ROUND_ROBIN,
        assignees: [], // Нужно заполнить реальными ID менеджеров
        isActive: true,
        priority: 1,
        workingHoursStart: '09:00',
        workingHoursEnd: '18:00',
        workingDays: [1, 2, 3, 4, 5] // Понедельник - Пятница
      },
      {
        name: 'High Value Leads',
        description: 'Высокоценные лиды для опытных менеджеров',
        method: DistributionMethod.SKILL_BASED,
        conditions: {
          estimatedValue: 50000,
          score: 70
        },
        assignees: [], // Senior менеджеры
        weights: {}, // Веса для senior менеджеров
        isActive: true,
        priority: 5,
        maxLeadsPerUser: 10
      },
      {
        name: 'Website Leads Load Based',
        description: 'Лиды с сайта распределяются по загрузке',
        method: DistributionMethod.LOAD_BASED,
        conditions: {
          source: 'website'
        },
        assignees: [], // Все менеджеры
        isActive: true,
        priority: 3,
        maxLeadsPerUser: 20
      }
    ];
  }
}
