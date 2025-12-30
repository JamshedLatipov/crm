import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/user.entity';

export enum ForecastType {
  REVENUE = 'revenue',
  DEALS = 'deals',
  CONVERSIONS = 'conversions',
  CUSTOM = 'custom'
}

export enum ForecastMethod {
  LINEAR_TREND = 'linear_trend',
  WEIGHTED_AVERAGE = 'weighted_average',
  PIPELINE_CONVERSION = 'pipeline_conversion',
  MOVING_AVERAGE = 'moving_average',
  EXPONENTIAL_SMOOTHING = 'exponential_smoothing',
  HISTORICAL_AVERAGE = 'historical_average'
}

export enum ForecastPeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export enum ForecastStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

@Entity('forecasts')
export class Forecast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ForecastType,
    default: ForecastType.REVENUE
  })
  type: ForecastType;

  @Column({
    type: 'enum',
    enum: ForecastMethod,
    default: ForecastMethod.PIPELINE_CONVERSION
  })
  method: ForecastMethod;

  @Column({
    type: 'enum',
    enum: ForecastPeriodType,
    default: ForecastPeriodType.MONTHLY
  })
  periodType: ForecastPeriodType;

  @Column({
    type: 'enum',
    enum: ForecastStatus,
    default: ForecastStatus.DRAFT
  })
  status: ForecastStatus;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  targetValue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  actualValue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  predictedValue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence: number; // 0-100%

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  accuracy: number; // 0-100%

  // Параметры алгоритма
  @Column({ type: 'jsonb', nullable: true })
  algorithmParams: Record<string, any>;

  // Исторические данные для расчета
  @Column({ type: 'jsonb', nullable: true })
  historicalData: Record<string, any>;

  // Результаты расчета
  @Column({ type: 'jsonb', nullable: true })
  calculationResults: Record<string, any>;

  // Владелец прогноза
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  @Column({ nullable: true })
  ownerId: string;

  // Команда или отдел
  @Column({ nullable: true })
  team: string;

  // Теги для группировки
  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
