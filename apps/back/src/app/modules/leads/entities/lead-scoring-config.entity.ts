import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface ScoringRule {
  field: string;
  condition: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'exists';
  value: any;
  score: number;
  description: string;
}

export interface ScoringCriteriaConfig {
  // Демографические критерии
  profileCompletion: {
    maxScore: number;
    rules: ScoringRule[];
  };
  jobTitleMatch: {
    maxScore: number;
    targetTitles: string[];
    rules: ScoringRule[];
  };
  companySize: {
    maxScore: number;
    rules: ScoringRule[];
  };
  industryMatch: {
    maxScore: number;
    targetIndustries: string[];
    rules: ScoringRule[];
  };

  // Поведенческие критерии
  websiteActivity: {
    maxScore: number;
    rules: ScoringRule[];
  };
  emailEngagement: {
    maxScore: number;
    rules: ScoringRule[];
  };
  formSubmissions: {
    maxScore: number;
    rules: ScoringRule[];
  };
  contentDownloads: {
    maxScore: number;
    rules: ScoringRule[];
  };

  // Взаимодействие
  responseTime: {
    maxScore: number;
    rules: ScoringRule[];
  };
  communicationFrequency: {
    maxScore: number;
    rules: ScoringRule[];
  };
  meetingAttendance: {
    maxScore: number;
    rules: ScoringRule[];
  };

  // Готовность к покупке
  budgetConfirmed: {
    maxScore: number;
    rules: ScoringRule[];
  };
  decisionMaker: {
    maxScore: number;
    rules: ScoringRule[];
  };
  timeframeDefined: {
    maxScore: number;
    rules: ScoringRule[];
  };
}

@Entity('lead_scoring_config')
export class LeadScoringConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // Название конфигурации (например, "Default", "Enterprise", "SMB")

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json' })
  config: ScoringCriteriaConfig;

  @Column({ type: 'json', nullable: true })
  thresholds: {
    cold: { min: number; max: number };
    warm: { min: number; max: number };
    hot: { min: number; max: number };
  };

  @Column({ default: false })
  isActive: boolean; // Активная конфигурация

  @Column({ default: false })
  isDefault: boolean; // Конфигурация по умолчанию

  @Column({ nullable: true })
  createdBy: string; // ID пользователя который создал

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Вспомогательные методы
  static getDefaultConfig(): ScoringCriteriaConfig {
    return {
      profileCompletion: {
        maxScore: 15,
        rules: [
          { field: 'name', condition: 'exists', value: true, score: 2, description: 'Указано имя' },
          { field: 'email', condition: 'exists', value: true, score: 3, description: 'Указан email' },
          { field: 'phone', condition: 'exists', value: true, score: 2, description: 'Указан телефон' },
          { field: 'company', condition: 'exists', value: true, score: 3, description: 'Указана компания' },
          { field: 'position', condition: 'exists', value: true, score: 2, description: 'Указана должность' },
          { field: 'industry', condition: 'exists', value: true, score: 2, description: 'Указана отрасль' },
          { field: 'website', condition: 'exists', value: true, score: 1, description: 'Указан сайт' }
        ]
      },
      jobTitleMatch: {
        maxScore: 10,
        targetTitles: ['CEO', 'CTO', 'Директор', 'Руководитель', 'Менеджер', 'Manager', 'Director'],
        rules: [
          { field: 'position', condition: 'contains', value: ['CEO', 'Директор'], score: 10, description: 'Высшее руководство' },
          { field: 'position', condition: 'contains', value: ['CTO', 'Руководитель'], score: 8, description: 'Руководящая должность' },
          { field: 'position', condition: 'contains', value: ['Менеджер', 'Manager'], score: 5, description: 'Управленческая должность' }
        ]
      },
      companySize: {
        maxScore: 10,
        rules: [
          { field: 'employees', condition: 'greater_than', value: 500, score: 10, description: 'Крупная компания' },
          { field: 'employees', condition: 'between', value: [50, 500], score: 7, description: 'Средняя компания' },
          { field: 'employees', condition: 'between', value: [10, 49], score: 4, description: 'Малая компания' }
        ]
      },
      industryMatch: {
        maxScore: 10,
        targetIndustries: ['IT', 'Технологии', 'Финансы', 'Производство'],
        rules: [
          { field: 'industry', condition: 'contains', value: ['IT', 'Технологии'], score: 10, description: 'Целевая отрасль' },
          { field: 'industry', condition: 'contains', value: ['Финансы', 'Производство'], score: 8, description: 'Перспективная отрасль' }
        ]
      },
      websiteActivity: {
        maxScore: 15,
        rules: [
          { field: 'pageViews', condition: 'greater_than', value: 10, score: 5, description: 'Высокая активность' },
          { field: 'sessionDuration', condition: 'greater_than', value: 300, score: 3, description: 'Долгое время на сайте' },
          { field: 'visitFrequency', condition: 'greater_than', value: 3, score: 4, description: 'Частые посещения' },
          { field: 'pricingPageVisit', condition: 'equals', value: true, score: 3, description: 'Посещение страницы цен' }
        ]
      },
      emailEngagement: {
        maxScore: 10,
        rules: [
          { field: 'emailOpens', condition: 'greater_than', value: 5, score: 3, description: 'Открывает письма' },
          { field: 'emailClicks', condition: 'greater_than', value: 2, score: 4, description: 'Кликает по ссылкам' },
          { field: 'emailReplies', condition: 'greater_than', value: 0, score: 3, description: 'Отвечает на письма' }
        ]
      },
      formSubmissions: {
        maxScore: 10,
        rules: [
          { field: 'contactForm', condition: 'equals', value: true, score: 5, description: 'Заполнил форму обратной связи' },
          { field: 'demoRequest', condition: 'equals', value: true, score: 8, description: 'Запросил демо' },
          { field: 'subscribed', condition: 'equals', value: true, score: 2, description: 'Подписался на рассылку' }
        ]
      },
      contentDownloads: {
        maxScore: 10,
        rules: [
          { field: 'whitepaper', condition: 'greater_than', value: 0, score: 4, description: 'Скачал документы' },
          { field: 'caseStudy', condition: 'greater_than', value: 0, score: 5, description: 'Изучает кейсы' },
          { field: 'webinarAttendance', condition: 'greater_than', value: 0, score: 6, description: 'Посещает вебинары' }
        ]
      },
      responseTime: {
        maxScore: 10,
        rules: [
          { field: 'avgResponseTime', condition: 'less_than', value: 3600, score: 8, description: 'Быстро отвечает (до часа)' },
          { field: 'avgResponseTime', condition: 'less_than', value: 86400, score: 5, description: 'Отвечает в течение дня' },
          { field: 'avgResponseTime', condition: 'greater_than', value: 86400, score: 2, description: 'Медленно отвечает' }
        ]
      },
      communicationFrequency: {
        maxScore: 5,
        rules: [
          { field: 'contactsPerWeek', condition: 'greater_than', value: 2, score: 5, description: 'Активное общение' },
          { field: 'contactsPerWeek', condition: 'equals', value: 1, score: 3, description: 'Регулярное общение' }
        ]
      },
      meetingAttendance: {
        maxScore: 5,
        rules: [
          { field: 'meetingsAttended', condition: 'greater_than', value: 0, score: 5, description: 'Посещает встречи' }
        ]
      },
      budgetConfirmed: {
        maxScore: 10,
        rules: [
          { field: 'budgetDiscussed', condition: 'equals', value: true, score: 10, description: 'Обсуждался бюджет' }
        ]
      },
      decisionMaker: {
        maxScore: 10,
        rules: [
          { field: 'isDecisionMaker', condition: 'equals', value: true, score: 10, description: 'Принимает решения' },
          { field: 'hasInfluence', condition: 'equals', value: true, score: 6, description: 'Влияет на решения' }
        ]
      },
      timeframeDefined: {
        maxScore: 5,
        rules: [
          { field: 'decisionTimeframe', condition: 'exists', value: true, score: 5, description: 'Определены сроки' }
        ]
      }
    };
  }
}