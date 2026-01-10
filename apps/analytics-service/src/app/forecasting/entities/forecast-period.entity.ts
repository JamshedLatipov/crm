import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Forecast } from './forecast.entity';

@Entity('forecast_periods')
export class ForecastPeriod {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Forecast, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'forecastId' })
  forecast?: Forecast;

  @Column()
  forecastId!: string;

  @Column({ type: 'date' })
  periodStart!: Date;

  @Column({ type: 'date' })
  periodEnd!: Date;

  @Column()
  periodLabel!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  targetValue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  actualValue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  predictedValue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  minValue!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  maxValue!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  variance!: number;

  @Column({ type: 'jsonb', nullable: true })
  breakdown?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metrics?: {
    dealsCount?: number;
    leadsCount?: number;
    conversionRate?: number;
    averageDealSize?: number;
    winRate?: number;
  };

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
