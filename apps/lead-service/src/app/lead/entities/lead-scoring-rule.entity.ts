import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ScoringRuleType {
  DEMOGRAPHIC = 'demographic',
  BEHAVIORAL = 'behavioral',
  ENGAGEMENT = 'engagement',
  FIRMOGRAPHIC = 'firmographic',
  CUSTOM = 'custom',
}

@Entity('lead_scoring_rules')
export class LeadScoringRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ScoringRuleType,
    default: ScoringRuleType.CUSTOM,
  })
  type!: ScoringRuleType;

  @Column({ type: 'int', default: 0 })
  points!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  conditions?: Record<string, string | number | boolean>;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
