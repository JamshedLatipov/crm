import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Forecast } from './forecast.entity';

@Entity('forecast_periods')
export class ForecastPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Forecast, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'forecastId' })
  forecast: Forecast;

  @Column()
  forecastId: string;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column()
  periodLabel: string; // "Q1 2026", "January 2026", "Week 1", etc.

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  targetValue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  actualValue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  predictedValue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  minValue: number; // Pessimistic scenario

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  maxValue: number; // Optimistic scenario

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence: number; // 0-100%

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  variance: number; // Отклонение от прогноза

  // Разбивка по источникам/каналам
  @Column({ type: 'jsonb', nullable: true })
  breakdown: Record<string, any>;

  // Метрики периода
  @Column({ type: 'jsonb', nullable: true })
  metrics: {
    dealsCount?: number;
    leadsCount?: number;
    conversionRate?: number;
    averageDealSize?: number;
    winRate?: number;
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
