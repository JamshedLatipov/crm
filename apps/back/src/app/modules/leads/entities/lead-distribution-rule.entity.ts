import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DistributionMethod {
  ROUND_ROBIN = 'round_robin',
  LOAD_BASED = 'load_based',
  SKILL_BASED = 'skill_based',
  GEOGRAPHIC = 'geographic',
  RANDOM = 'random',
  MANUAL = 'manual'
}

@Entity('lead_distribution_rules')
export class LeadDistributionRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: DistributionMethod,
    default: DistributionMethod.ROUND_ROBIN
  })
  method: DistributionMethod;

  @Column({ type: 'json', nullable: true })
  conditions: Record<string, string | number | boolean>; // Условия для применения правила

  @Column({ type: 'json' })
  assignees: string[]; // Список ID менеджеров для распределения

  @Column({ type: 'json', nullable: true })
  weights: Record<string, number>; // Веса для каждого менеджера

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number; // Приоритет применения правила

  @Column({ type: 'int', default: 0 })
  maxLeadsPerUser: number; // Максимальное количество лидов на пользователя

  @Column({ nullable: true })
  workingHoursStart: string; // Время начала работы (HH:mm)

  @Column({ nullable: true })
  workingHoursEnd: string; // Время окончания работы (HH:mm)

  @Column({ type: 'json', nullable: true })
  workingDays: number[]; // Рабочие дни недели (0-6, где 0 - воскресенье)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
