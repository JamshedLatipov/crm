import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DistributionMethod {
  ROUND_ROBIN = 'round_robin',
  WEIGHTED = 'weighted',
  LOAD_BALANCED = 'load_balanced',
  SKILL_BASED = 'skill_based',
  GEOGRAPHIC = 'geographic',
  RANDOM = 'random',
}

@Entity('lead_distribution_rules')
export class LeadDistributionRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: DistributionMethod,
    default: DistributionMethod.ROUND_ROBIN,
  })
  method!: DistributionMethod;

  @Column({ type: 'jsonb', nullable: true })
  conditions?: Record<string, string | number | boolean>;

  @Column({ type: 'jsonb', default: [] })
  assignees!: number[];

  @Column({ type: 'jsonb', nullable: true })
  weights?: Record<string, number>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'int', nullable: true })
  maxLeadsPerUser?: number;

  @Column({ type: 'varchar', nullable: true })
  workingHoursStart?: string;

  @Column({ type: 'varchar', nullable: true })
  workingHoursEnd?: string;

  @Column({ type: 'simple-array', nullable: true })
  workingDays?: number[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
