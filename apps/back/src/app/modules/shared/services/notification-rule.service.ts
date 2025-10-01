import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  NotificationRule, 
  TriggerCondition, 
  RuleCondition, 
  RuleAction 
} from '../entities/notification-rule.entity';
import { NotificationType, NotificationChannel, NotificationPriority } from '../entities/notification.entity';
import { NotificationService } from './notification.service';

export interface CreateRuleDto {
  name: string;
  description?: string;
  type: NotificationType;
  priority?: NotificationPriority;
  conditions: RuleCondition[];
  actions: RuleAction;
  filters?: any;
  isActive?: boolean;
  createdBy: string;
}

export interface RuleEvaluationContext {
  leadId?: number;
  leadScore?: {
    totalScore: number;
    temperature: string;
    scoreChange?: number;
    previousScore?: number;
  };
  leadData?: {
    name?: string;
    email?: string;
    status?: string;
    source?: string;
    assignedTo?: string;
  };
  dealId?: number;
  dealData?: {
    title?: string;
    value?: number;
    previousValue?: number;
    stage?: string;
    previousStage?: string;
    status?: string;
    closeDate?: string;
    assignedTo?: string;
  };
  userId?: string;
  timestamp?: Date;
}

@Injectable()
export class NotificationRuleService {
  constructor(
    @InjectRepository(NotificationRule)
    private ruleRepository: Repository<NotificationRule>,
    private notificationService: NotificationService
  ) {}

  async createRule(dto: CreateRuleDto): Promise<NotificationRule> {
    const rule = this.ruleRepository.create({
      ...dto,
      priority: dto.priority || NotificationPriority.MEDIUM,
      isActive: dto.isActive !== undefined ? dto.isActive : true
    });

    return this.ruleRepository.save(rule);
  }

  async findAll(): Promise<NotificationRule[]> {
    return this.ruleRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findActiveRules(): Promise<NotificationRule[]> {
    return this.ruleRepository.find({
      where: { isActive: true },
      order: { priority: 'DESC', createdAt: 'ASC' }
    });
  }

  async findRulesByType(type: NotificationType): Promise<NotificationRule[]> {
    return this.ruleRepository.find({
      where: { type, isActive: true }
    });
  }

  async updateRule(id: number, updates: Partial<NotificationRule>): Promise<NotificationRule | null> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) return null;

    Object.assign(rule, updates);
    return this.ruleRepository.save(rule);
  }

  async deleteRule(id: number): Promise<boolean> {
    const result = await this.ruleRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async toggleRule(id: number): Promise<NotificationRule | null> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) return null;

    rule.isActive = !rule.isActive;
    return this.ruleRepository.save(rule);
  }

  // Основной метод для оценки правил и создания уведомлений
  async evaluateRules(context: RuleEvaluationContext): Promise<void> {
    const activeRules = await this.findActiveRules();

    for (const rule of activeRules) {
      try {
        if (await this.shouldTriggerRule(rule, context)) {
          await this.triggerRule(rule, context);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }
  }

  // Проверка должно ли сработать правило
  private async shouldTriggerRule(rule: NotificationRule, context: RuleEvaluationContext): Promise<boolean> {
    // Проверяем может ли правило сработать (время, throttling)
    if (!rule.canTrigger()) {
      return false;
    }

    // Проверяем фильтры
    if (!this.passesFilters(rule, context)) {
      return false;
    }

    // Проверяем условия
    return this.evaluateConditions(rule.conditions, context);
  }

  // Проверка фильтров
  private passesFilters(rule: NotificationRule, context: RuleEvaluationContext): boolean {
    if (!rule.filters) return true;

    const filters = rule.filters;

    // Фильтр по источникам лидов
    if (filters.leadSources && context.leadData?.source) {
      if (!filters.leadSources.includes(context.leadData.source)) {
        return false;
      }
    }

    // Фильтр по ответственным
    if (filters.assignedTo) {
      const assignedTo = context.leadData?.assignedTo || context.dealData?.assignedTo;
      if (assignedTo && !filters.assignedTo.includes(assignedTo)) {
        return false;
      }
    }

    // Фильтр по статусам лидов
    if (filters.leadStatus && context.leadData?.status) {
      if (!filters.leadStatus.includes(context.leadData.status)) {
        return false;
      }
    }

    return true;
  }

  // Оценка условий
  private evaluateConditions(conditions: RuleCondition[], context: RuleEvaluationContext): boolean {
    if (!conditions || conditions.length === 0) return true;

    let result = true;
    let operator: 'AND' | 'OR' = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, context);

      if (operator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      // Обновляем оператор для следующей итерации
      if (condition.operator) {
        operator = condition.operator;
      }
    }

    return result;
  }

  // Оценка отдельного условия
  private evaluateCondition(condition: RuleCondition, context: RuleEvaluationContext): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);
    
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    switch (condition.condition) {
      case TriggerCondition.SCORE_EQUALS:
        return fieldValue === condition.value;

      case TriggerCondition.SCORE_GREATER_THAN:
        return Number(fieldValue) > Number(condition.value);

      case TriggerCondition.SCORE_LESS_THAN:
        return Number(fieldValue) < Number(condition.value);

      case TriggerCondition.SCORE_INCREASED_BY:
        const scoreChange = context.leadScore?.scoreChange || 0;
        return scoreChange >= Number(condition.value);

      case TriggerCondition.SCORE_DECREASED_BY:
        const scoreDecrease = -(context.leadScore?.scoreChange || 0);
        return scoreDecrease >= Number(condition.value);

      case TriggerCondition.TEMPERATURE_CHANGED_TO:
        return fieldValue === condition.value;

      case TriggerCondition.TEMPERATURE_CHANGED_FROM:
        // Нужно сравнить с предыдущим значением
        return true; // Упрощенная логика

      default:
        return false;
    }
  }

  // Получение значения поля из контекста
  private getFieldValue(field: string, context: RuleEvaluationContext): any {
    const parts = field.split('.');
    let current: any = context;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  // Срабатывание правила
  private async triggerRule(rule: NotificationRule, context: RuleEvaluationContext): Promise<void> {
    const actions = rule.actions;
    
    // Определяем получателя
    const recipientId = this.determineRecipient(context);
    if (!recipientId) return;

    // Генерируем сообщение
    const { title, message } = this.generateMessage(rule, context);

    // Создаем уведомления для каждого канала
    const notifications = [];
    for (const channel of actions.channels) {
      const notificationData = {
        type: rule.type,
        title,
        message,
        channel,
        priority: rule.priority,
        recipientId,
        data: this.prepareNotificationData(context),
        scheduledAt: actions.delay ? new Date(Date.now() + actions.delay * 60000) : undefined
      };

      notifications.push(notificationData);
    }

    await this.notificationService.createBulk(notifications);

    // Отмечаем срабатывание правила
    rule.markTriggered();
    await this.ruleRepository.save(rule);
  }

  // Определение получателя уведомления
  private determineRecipient(context: RuleEvaluationContext): string | null {
    // Приоритет: назначенный пользователь > пользователь из контекста
    return context.leadData?.assignedTo || 
           context.dealData?.assignedTo || 
           context.userId || 
           null;
  }

  // Генерация сообщения
  private generateMessage(rule: NotificationRule, context: RuleEvaluationContext): { title: string; message: string } {
    const template = rule.actions.template;

    switch (template) {
      case 'hot_lead_detected':
        return {
          title: '🔥 Горячий лид обнаружен!',
          message: `Лид "${context.leadData?.name}" стал горячим (${context.leadScore?.totalScore} баллов)`
        };

      case 'score_increased':
        return {
          title: '📈 Скор лида увеличился',
          message: `Скор лида "${context.leadData?.name}" увеличился на ${context.leadScore?.scoreChange} баллов`
        };

      case 'high_score_threshold':
        return {
          title: '⭐ Высокий скор достигнут',
          message: `Лид "${context.leadData?.name}" достиг высокого скора: ${context.leadScore?.totalScore} баллов`
        };

      case 'deal_won':
        return {
          title: '🎉 Сделка выиграна!',
          message: `Сделка "${context.dealData?.title}" успешно закрыта на сумму ${context.dealData?.value}`
        };

      case 'deal_high_value':
        return {
          title: '💰 Крупная сделка',
          message: `Создана крупная сделка "${context.dealData?.title}" на сумму ${context.dealData?.value}`
        };

      default:
        return {
          title: rule.name,
          message: `Событие ${rule.type} произошло`
        };
    }
  }

  // Подготовка данных для уведомления
  private prepareNotificationData(context: RuleEvaluationContext): any {
    const data: any = {};

    if (context.leadId) {
      data.leadId = context.leadId;
      data.entityType = 'lead';
      if (context.leadData) {
        data.leadName = context.leadData.name;
        data.leadEmail = context.leadData.email;
        data.leadStatus = context.leadData.status;
        data.leadSource = context.leadData.source;
      }
      if (context.leadScore) {
        data.currentScore = context.leadScore.totalScore;
        data.temperature = context.leadScore.temperature;
        data.scoreChange = context.leadScore.scoreChange;
        data.previousScore = context.leadScore.previousScore;
      }
    }

    if (context.dealId) {
      data.dealId = context.dealId;
      data.entityType = 'deal';
      if (context.dealData) {
        data.dealTitle = context.dealData.title;
        data.dealValue = context.dealData.value;
        data.previousValue = context.dealData.previousValue;
        data.dealStage = context.dealData.stage;
        data.previousStage = context.dealData.previousStage;
        data.dealStatus = context.dealData.status;
        data.closeDate = context.dealData.closeDate;
      }
    }

    return data;
  }

  // Утилиты для создания стандартных правил
  async createDefaultRules(createdBy: string): Promise<NotificationRule[]> {
    const defaultRules = [
      NotificationRule.createHotLeadRule(),
      NotificationRule.createScoreIncreaseRule(),
      NotificationRule.createHighScoreThresholdRule()
    ];

    const rules = defaultRules.map(ruleData => ({
      ...ruleData,
      createdBy
    }));

    return this.ruleRepository.save(rules as NotificationRule[]);
  }

  async createDealRules(createdBy: string): Promise<NotificationRule[]> {
    const dealRules = [
      {
        name: 'Крупная сделка создана',
        description: 'Уведомление при создании сделки свыше определенной суммы',
        type: NotificationType.DEAL_HIGH_VALUE,
        priority: NotificationPriority.HIGH,
        conditions: [
          {
            field: 'dealData.value',
            condition: TriggerCondition.SCORE_GREATER_THAN,
            value: 100000
          }
        ],
        actions: {
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          template: 'deal_high_value',
          delay: 0,
          throttle: 60
        },
        isActive: true,
        createdBy
      },
      {
        name: 'Сделка выиграна',
        description: 'Уведомление при успешном закрытии сделки',
        type: NotificationType.DEAL_WON,
        priority: NotificationPriority.HIGH,
        conditions: [
          {
            field: 'dealData.status',
            condition: TriggerCondition.TEMPERATURE_CHANGED_TO,
            value: 'won'
          }
        ],
        actions: {
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
          template: 'deal_won',
          delay: 0,
          throttle: 0
        },
        isActive: true,
        createdBy
      }
    ];

    return this.ruleRepository.save(dealRules as NotificationRule[]);
  }
}