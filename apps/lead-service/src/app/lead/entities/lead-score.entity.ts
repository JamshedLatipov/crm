import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lead } from './lead.entity';

export enum LeadTemperature {
  COLD = 'cold',
  WARM = 'warm',
  HOT = 'hot',
}

@Entity('lead_scores')
export class LeadScore {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  leadId!: number;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadId' })
  lead?: Lead;

  @Column({ type: 'int', default: 0 })
  totalScore!: number;

  @Column({
    type: 'enum',
    enum: LeadTemperature,
    default: LeadTemperature.COLD,
  })
  temperature!: LeadTemperature;

  @Column({ type: 'jsonb', nullable: true })
  criteria?: Record<string, number>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastCalculatedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
