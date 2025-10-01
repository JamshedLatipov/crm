import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../lead.entity';
import { LeadScoringRule, ScoringRuleType } from '../entities/lead-scoring-rule.entity';
import { LeadActivity, ActivityType } from '../entities/lead-activity.entity';
import { NotificationRuleService } from '../../shared/services/notification-rule.service';
import { NotificationType } from '../../shared/entities/notification.entity';
import { AssignmentService } from '../../shared/services/assignment.service';

export interface ScoringContext {
  lead: Lead;
  activity?: {
    type: ActivityType;
    metadata?: Record<string, string | number | boolean>;
  };
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
}

@Injectable()
export class LeadScoringService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(LeadScoringRule)
    private readonly scoringRuleRepo: Repository<LeadScoringRule>,
    @InjectRepository(LeadActivity)
    private readonly activityRepo: Repository<LeadActivity>,
    private readonly notificationRuleService: NotificationRuleService,
    private readonly assignmentService: AssignmentService
  ) {}

  async calculateScore(leadId: number, context: ScoringContext): Promise<number> {
    const lead = await this.leadRepo.findOneBy({ id: leadId });
    if (!lead) {
      throw new Error('Lead not found');
    }

    const rules = await this.scoringRuleRepo.find({
      where: { isActive: true },
      order: { priority: 'DESC' }
    });

    const previousScore = lead.score;
    const previousTemperature = this.getTemperature(previousScore);
    let totalScore = lead.score;

    for (const rule of rules) {
      const points = await this.applyRule(rule, { ...context, lead });
      if (points > 0) {
        totalScore += points;
        
        // Записываем активность скоринга
        await this.activityRepo.save({
          leadId: lead.id,
          type: ActivityType.SCORE_UPDATED,
          title: `Применено правило скоринга: ${rule.name}`,
          description: `Добавлено ${points} баллов`,
          scorePoints: points,
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: rule.type
          }
        });
      }
    }

    // Обновляем общий скор лида
    await this.leadRepo.update(leadId, { score: totalScore });

    // Определяем новую температуру
    const currentTemperature = this.getTemperature(totalScore);
    const scoreChange = totalScore - previousScore;

    // Запускаем оценку правил уведомлений
    await this.triggerNotifications(lead, {
      previousScore,
      currentScore: totalScore,
      scoreChange,
      previousTemperature,
      currentTemperature
    });

    return totalScore;
  }

  private getTemperature(score: number): string {
    if (score >= 71) return 'hot';
    if (score >= 31) return 'warm';
    return 'cold';
  }

  private async triggerNotifications(
    lead: Lead, 
    scoreData: {
      previousScore: number;
      currentScore: number;
      scoreChange: number;
      previousTemperature: string;
      currentTemperature: string;
    }
  ): Promise<void> {
    const { previousScore, currentScore, scoreChange, previousTemperature, currentTemperature } = scoreData;

    // Подготавливаем контекст для правил уведомлений
    const notificationContext = {
      leadId: lead.id,
      leadScore: {
        totalScore: currentScore,
        temperature: currentTemperature,
        scoreChange,
        previousScore
      },
      leadData: {
        name: lead.name,
        email: lead.email,
        status: lead.status,
        source: lead.source,
        assignedTo: null // Will be populated from assignments
      },
      userId: null, // Will be populated from assignments
      timestamp: new Date()
    };

    // Получаем текущие назначения для получения userId
    const currentAssignments = await this.assignmentService.getCurrentAssignments('lead', lead.id.toString());
    if (currentAssignments.length > 0) {
      notificationContext.leadData.assignedTo = currentAssignments[0].userId.toString();
      notificationContext.userId = currentAssignments[0].userId.toString();
    }

    // Проверяем различные сценарии для уведомлений
    if (currentTemperature !== previousTemperature) {
      // Температура изменилась
      switch (currentTemperature) {
        case 'hot':
          // Лид стал горячим
          await this.notificationRuleService.evaluateRules({
            ...notificationContext,
            // Дополнительный контекст для горячих лидов
          });
          break;
        case 'warm':
          if (previousTemperature === 'cold') {
            // Лид стал теплым из холодного
            await this.notificationRuleService.evaluateRules(notificationContext);
          }
          break;
      }
    }

    // Проверяем значительные изменения скора
    if (Math.abs(scoreChange) >= 10) {
      await this.notificationRuleService.evaluateRules(notificationContext);
    }

    // Проверяем пороговые значения
    if (currentScore >= 80 && previousScore < 80) {
      // Достигнут высокий порог
      await this.notificationRuleService.evaluateRules(notificationContext);
    }

    if (currentScore >= 50 && previousScore < 50) {
      // Достигнут средний порог
      await this.notificationRuleService.evaluateRules(notificationContext);
    }
  }

  private async applyRule(rule: LeadScoringRule, context: ScoringContext): Promise<number> {
    const { lead, activity } = context;

    // Проверяем условия применения правила
    if (rule.conditions && !this.checkConditions(rule.conditions, context)) {
      return 0;
    }

    switch (rule.type) {
      case ScoringRuleType.EMAIL_OPENED:
        return activity?.type === ActivityType.EMAIL_OPENED ? rule.points : 0;

      case ScoringRuleType.EMAIL_CLICKED:
        return activity?.type === ActivityType.EMAIL_CLICKED ? rule.points : 0;

      case ScoringRuleType.WEBSITE_VISIT:
        return activity?.type === ActivityType.WEBSITE_VISIT ? rule.points : 0;

      case ScoringRuleType.FORM_SUBMITTED:
        return activity?.type === ActivityType.FORM_SUBMITTED ? rule.points : 0;

      case ScoringRuleType.DOWNLOAD:
        return activity?.type === ActivityType.DOCUMENT_DOWNLOADED ? rule.points : 0;

      case ScoringRuleType.WEBINAR_ATTENDED:
        return activity?.type === ActivityType.WEBINAR_ATTENDED ? rule.points : 0;

      case ScoringRuleType.DEMO_REQUESTED:
        return activity?.type === ActivityType.DEMO_REQUESTED ? rule.points : 0;

      case ScoringRuleType.PHONE_CALL:
        return activity?.type === ActivityType.PHONE_CALL_RECEIVED || 
               activity?.type === ActivityType.PHONE_CALL_MADE ? rule.points : 0;

      case ScoringRuleType.MEETING_SCHEDULED:
        return activity?.type === ActivityType.MEETING_SCHEDULED ? rule.points : 0;

      case ScoringRuleType.PROPOSAL_VIEWED:
        return activity?.type === ActivityType.PROPOSAL_VIEWED ? rule.points : 0;

      case ScoringRuleType.CONTACT_INFO_PROVIDED:
        return lead.email || lead.phone ? rule.points : 0;

      case ScoringRuleType.COMPANY_SIZE:
        // Логика оценки размера компании
        return this.scoreCompanySize(lead, rule);

      case ScoringRuleType.INDUSTRY_MATCH:
        // Логика оценки соответствия индустрии
        return this.scoreIndustryMatch(lead, rule);

      case ScoringRuleType.BUDGET_INDICATED:
        return lead.estimatedValue && lead.estimatedValue > 0 ? rule.points : 0;

      case ScoringRuleType.DECISION_MAKER:
        // Логика определения лица, принимающего решения
        return this.scoreDecisionMaker(lead, rule);

      case ScoringRuleType.PRICE_PAGE_VIEWED:
        return activity?.type === ActivityType.WEBSITE_VISIT && 
               activity?.metadata?.page?.toString().includes('pricing') ? rule.points : 0;

      default:
        return 0;
    }
  }

  private checkConditions(conditions: Record<string, string | number | boolean>, context: ScoringContext): boolean {
    const { lead, utm } = context;

    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case 'source':
          if (lead.source !== value) return false;
          break;
        case 'utmSource':
          if (utm?.source !== value) return false;
          break;
        case 'utmMedium':
          if (utm?.medium !== value) return false;
          break;
        case 'hasEmail':
          if (Boolean(lead.email) !== value) return false;
          break;
        case 'hasPhone':
          if (Boolean(lead.phone) !== value) return false;
          break;
        case 'hasCompany':
          if (Boolean(lead.company) !== value) return false;
          break;
        case 'minEstimatedValue':
          if (!lead.estimatedValue || lead.estimatedValue < Number(value)) return false;
          break;
        default:
          // Проверка кастомных полей
          if (lead.customFields && lead.customFields[key] !== value) return false;
      }
    }

    return true;
  }

  private scoreCompanySize(lead: Lead, rule: LeadScoringRule): number {
    // Простая логика оценки размера компании
    // В реальности можно использовать API для обогащения данных
    const companyName = lead.company?.id?.toLowerCase() || '';
    
    if (companyName.includes('corp') || companyName.includes('corporation') || 
        companyName.includes('ltd') || companyName.includes('inc')) {
      return rule.points;
    }
    
    return 0;
  }

  private scoreIndustryMatch(lead: Lead, rule: LeadScoringRule): number {
    // Логика оценки соответствия индустрии
    // Можно использовать machine learning или API для определения индустрии
    const targetIndustries = Array.isArray(rule.conditions?.targetIndustries) 
      ? rule.conditions.targetIndustries as string[]
      : [];
    const companyName = lead.company?.id?.toLowerCase() || '';
    
    for (const industry of targetIndustries) {
      if (companyName.includes(industry.toLowerCase())) {
        return rule.points;
      }
    }
    
    return 0;
  }

  private scoreDecisionMaker(lead: Lead, rule: LeadScoringRule): number {
    const position = lead.position?.toLowerCase() || '';
    const decisionMakerTitles = [
      'ceo', 'cto', 'cfo', 'founder', 'director', 'manager', 'head', 'chief', 'president', 'owner'
    ];
    
    for (const title of decisionMakerTitles) {
      if (position.includes(title)) {
        return rule.points;
      }
    }
    
    return 0;
  }

  async getLeadsByScore(minScore = 0, limit = 50): Promise<Lead[]> {
    return this.leadRepo.find({
      where: {
        score: minScore ? undefined : minScore // TypeORM MoreThanOrEqual можно добавить
      },
      order: { score: 'DESC' },
      take: limit
    });
  }

  async updateConversionProbability(leadId: number): Promise<void> {
    const lead = await this.leadRepo.findOneBy({ id: leadId });
    if (!lead) return;

    // Простая формула расчета вероятности конверсии на основе скора
    let probability = Math.min((lead.score / 100) * 100, 95); // Максимум 95%

    // Коррекция на основе статуса
    switch (lead.status) {
      case LeadStatus.NEW:
        probability *= 0.3;
        break;
      case LeadStatus.CONTACTED:
        probability *= 0.5;
        break;
      case LeadStatus.QUALIFIED:
        probability *= 0.7;
        break;
      case LeadStatus.PROPOSAL_SENT:
        probability *= 0.8;
        break;
      case LeadStatus.NEGOTIATING:
        probability *= 0.9;
        break;
      case LeadStatus.CONVERTED:
        probability = 100;
        break;
      case LeadStatus.REJECTED:
      case LeadStatus.LOST:
        probability = 0;
        break;
    }

    await this.leadRepo.update(leadId, { 
      conversionProbability: Math.round(probability * 100) / 100 
    });
  }

  async getDefaultScoringRules(): Promise<Partial<LeadScoringRule>[]> {
    return [
      {
        name: 'Email Opened',
        description: 'Лид открыл email',
        type: ScoringRuleType.EMAIL_OPENED,
        points: 5,
        isActive: true,
        priority: 1
      },
      {
        name: 'Email Clicked',
        description: 'Лид кликнул по ссылке в email',
        type: ScoringRuleType.EMAIL_CLICKED,
        points: 10,
        isActive: true,
        priority: 2
      },
      {
        name: 'Form Submitted',
        description: 'Лид заполнил форму на сайте',
        type: ScoringRuleType.FORM_SUBMITTED,
        points: 25,
        isActive: true,
        priority: 3
      },
      {
        name: 'Demo Requested',
        description: 'Лид запросил демо',
        type: ScoringRuleType.DEMO_REQUESTED,
        points: 50,
        isActive: true,
        priority: 4
      },
      {
        name: 'Contact Info Provided',
        description: 'Лид предоставил контактную информацию',
        type: ScoringRuleType.CONTACT_INFO_PROVIDED,
        points: 15,
        isActive: true,
        priority: 1
      },
      {
        name: 'Budget Indicated',
        description: 'Лид указал бюджет',
        type: ScoringRuleType.BUDGET_INDICATED,
        points: 30,
        isActive: true,
        priority: 3
      }
    ];
  }
}
