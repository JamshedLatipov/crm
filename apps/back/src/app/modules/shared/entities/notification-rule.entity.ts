import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NotificationType, NotificationChannel, NotificationPriority } from './notification.entity';

export enum TriggerCondition {
  SCORE_EQUALS = 'score_equals',
  SCORE_GREATER_THAN = 'score_greater_than',
  SCORE_LESS_THAN = 'score_less_than',
  SCORE_INCREASED_BY = 'score_increased_by',
  SCORE_DECREASED_BY = 'score_decreased_by',
  TEMPERATURE_CHANGED_TO = 'temperature_changed_to',
  TEMPERATURE_CHANGED_FROM = 'temperature_changed_from',
  TIME_INTERVAL = 'time_interval'
}

export interface RuleCondition {
  field: string; // leadScore.totalScore, leadScore.temperature, etc.
  condition: TriggerCondition;
  value: number | string;
  operator?: 'AND' | 'OR';
}

export interface RuleAction {
  channels: NotificationChannel[];
  template: string;
  delay?: number; // Задержка в минутах
  throttle?: number; // Минимальный интервал между уведомлениями (в минутах)
}

@Entity('notification_rules')
export class NotificationRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: NotificationType
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM
  })
  priority: NotificationPriority;

  @Column({ type: 'json' })
  conditions: RuleCondition[]; // Условия срабатывания

  @Column({ type: 'json' })
  actions: RuleAction; // Действия при срабатывании

  @Column({ type: 'json', nullable: true })
  filters: {
    leadSources?: string[]; // Фильтр по источникам лидов
    assignedTo?: string[]; // Фильтр по ответственным
    leadTags?: string[]; // Фильтр по тегам
    leadStatus?: string[]; // Фильтр по статусам
    timeRange?: {
      start: string; // HH:mm
      end: string; // HH:mm
      timezone?: string;
    };
    daysOfWeek?: number[]; // 0-6 (воскресенье-суббота)
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  createdBy: string; // ID пользователя создавшего правило

  @Column({ nullable: true })
  lastTriggered?: Date;

  @Column({ type: 'int', default: 0 })
  triggerCount: number; // Количество срабатываний

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Вспомогательные методы
  canTrigger(): boolean {
    if (!this.isActive) return false;
    
    const now = new Date();
    
    // Проверка времени
    if (this.filters?.timeRange) {
      const timeRange = this.filters.timeRange;
      const currentTime = now.toTimeString().slice(0, 5); // HH:mm
      
      if (currentTime < timeRange.start || currentTime > timeRange.end) {
        return false;
      }
    }
    
    // Проверка дней недели
    if (this.filters?.daysOfWeek && this.filters.daysOfWeek.length > 0) {
      const currentDay = now.getDay();
      if (!this.filters.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }
    
    // Проверка throttling
    if (this.actions.throttle && this.lastTriggered) {
      const timeSinceLastTrigger = now.getTime() - this.lastTriggered.getTime();
      const throttleMs = this.actions.throttle * 60 * 1000; // Конвертируем минуты в миллисекунды
      
      if (timeSinceLastTrigger < throttleMs) {
        return false;
      }
    }
    
    return true;
  }

  markTriggered(): void {
    this.lastTriggered = new Date();
    this.triggerCount += 1;
  }

  static createHotLeadRule(): Partial<NotificationRule> {
    return {
      name: 'Горячий лид обнаружен',
      description: 'Уведомление когда лид становится горячим (71+ баллов)',
      type: NotificationType.HOT_LEAD_DETECTED,
      priority: NotificationPriority.HIGH,
      conditions: [
        {
          field: 'leadScore.temperature',
          condition: TriggerCondition.TEMPERATURE_CHANGED_TO,
          value: 'hot'
        }
      ],
      actions: {
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        template: 'hot_lead_detected',
        delay: 0,
        throttle: 60 // Не чаще раза в час для одного лида
      },
      isActive: true
    };
  }

  static createScoreIncreaseRule(): Partial<NotificationRule> {
    return {
      name: 'Значительное увеличение скора',
      description: 'Уведомление при увеличении скора на 20+ баллов',
      type: NotificationType.LEAD_SCORE_INCREASED,
      priority: NotificationPriority.MEDIUM,
      conditions: [
        {
          field: 'leadScore.scoreChange',
          condition: TriggerCondition.SCORE_INCREASED_BY,
          value: 20
        }
      ],
      actions: {
        channels: [NotificationChannel.IN_APP],
        template: 'score_increased',
        delay: 5,
        throttle: 30
      },
      isActive: true
    };
  }

  static createHighScoreThresholdRule(): Partial<NotificationRule> {
    return {
      name: 'Высокий скор достигнут',
      description: 'Уведомление когда лид достигает 80+ баллов',
      type: NotificationType.LEAD_SCORE_THRESHOLD,
      priority: NotificationPriority.HIGH,
      conditions: [
        {
          field: 'leadScore.totalScore',
          condition: TriggerCondition.SCORE_GREATER_THAN,
          value: 80
        }
      ],
      actions: {
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
        template: 'high_score_threshold',
        delay: 0,
        throttle: 120 // Не чаще раза в 2 часа
      },
      filters: {
        timeRange: {
          start: '09:00',
          end: '18:00'
        },
        daysOfWeek: [1, 2, 3, 4, 5] // Рабочие дни
      },
      isActive: true
    };
  }
}