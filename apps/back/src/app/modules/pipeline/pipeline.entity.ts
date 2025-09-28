import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum StageType {
  LEAD_QUALIFICATION = 'lead_qualification',
  DEAL_PROGRESSION = 'deal_progression'
}

@Entity('pipeline_stages')
export class PipelineStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: StageType,
    default: StageType.DEAL_PROGRESSION,
  })
  type: StageType;

  @Column({ default: 0 })
  position: number;

  @Column({ default: 50 })
  probability: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('pipeline_leads')
export class PipelineLead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  contact: string | null;

  @Column({ type: 'uuid', nullable: true })
  stageId: string | null;

  @Column({ type: 'json', nullable: true })
  meta: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
