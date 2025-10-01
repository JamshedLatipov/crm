import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Lead } from '../lead.entity';

export enum LeadTemperature {
  COLD = 'cold',     // 0-30 баллов
  WARM = 'warm',     // 31-70 баллов  
  HOT = 'hot'        // 71-100 баллов
}

export interface ScoreCriteria {
  // Демографические критерии
  profileCompletion: number;      // Полнота заполнения профиля (0-15 баллов)
  jobTitleMatch: number;          // Соответствие должности ЦА (0-10 баллов)
  companySize: number;            // Размер компании (0-10 баллов)
  industryMatch: number;          // Соответствие отрасли (0-10 баллов)
  
  // Поведенческие критерии
  websiteActivity: number;        // Активность на сайте (0-15 баллов)
  emailEngagement: number;        // Взаимодействие с email (0-10 баллов)
  formSubmissions: number;        // Заполнение форм (0-10 баллов)
  contentDownloads: number;       // Скачивание контента (0-10 баллов)
  
  // Взаимодействие
  responseTime: number;           // Время отклика (0-10 баллов)
  communicationFrequency: number; // Частота общения (0-5 баллов)
  meetingAttendance: number;      // Посещаемость встреч (0-5 баллов)
  
  // Готовность к покупке  
  budgetConfirmed: number;        // Подтвержден бюджет (0-10 баллов)
  decisionMaker: number;          // Является лицом принимающим решения (0-10 баллов)
  timeframeDefined: number;       // Определены временные рамки (0-5 баллов)
}

@Entity('lead_scores')
export class LeadScore {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn()
  lead: Lead;

  @Column()
  leadId: number;

  @Column({ type: 'int', default: 0 })
  totalScore: number; // Общий балл (0-100)

  @Column({
    type: 'enum',
    enum: LeadTemperature,
    default: LeadTemperature.COLD
  })
  temperature: LeadTemperature;

  @Column({ type: 'json' })
  criteria: ScoreCriteria;

  @Column({ type: 'json', nullable: true })
  scoreHistory: {
    date: Date;
    score: number;
    changes: Partial<ScoreCriteria>;
    reason?: string;
  }[];

  @Column({ type: 'int', default: 0 })
  previousScore: number;

  @Column({ nullable: true })
  lastCalculatedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: {
    lastWebsiteVisit?: Date;
    lastEmailOpen?: Date;
    lastFormSubmission?: Date;
    totalPageViews?: number;
    totalEmailOpens?: number;
    totalEmailClicks?: number;
    averageSessionDuration?: number;
    conversionEvents?: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Вычисляемые методы
  getScorePercent(): number {
    return Math.min(100, Math.max(0, this.totalScore));
  }

  getTemperatureFromScore(score: number): LeadTemperature {
    if (score >= 71) return LeadTemperature.HOT;
    if (score >= 31) return LeadTemperature.WARM;
    return LeadTemperature.COLD;
  }

  calculateTotalScore(): number {
    const criteria = this.criteria;
    const total = Object.values(criteria).reduce((sum, value) => sum + value, 0);
    this.totalScore = Math.min(100, Math.max(0, total));
    this.temperature = this.getTemperatureFromScore(this.totalScore);
    return this.totalScore;
  }
}