import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Queue } from '../../calls/entities/queue.entity';
import { User } from '../../user/user.entity';

export enum CampaignType {
  IVR = 'ivr',
  AGENT = 'agent',
  HYBRID = 'hybrid',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  STOPPED = 'stopped',
}

@Entity('outbound_campaigns')
export class OutboundCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: CampaignType })
  type: CampaignType;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  @Index()
  status: CampaignStatus;

  @Column({ name: 'audio_file_id', nullable: true })
  audioFileId: string;

  @Column({ name: 'audio_file_path', nullable: true })
  audioFilePath: string;

  @Column({ name: 'queue_id', type: 'int', nullable: true })
  queueId: number;

  @ManyToOne(() => Queue, { nullable: true, eager: true })
  @JoinColumn({ name: 'queue_id' })
  queue: Queue;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'jsonb', default: {} })
  settings: {
    maxAttempts: number;
    retryInterval: number; // minutes
    maxCallDuration: number; // seconds
    simultaneousCalls: number;
    callerIdNumber?: string;
    callerIdName?: string;
    dtmfOptions?: Record<string, string>;
  };

  @OneToMany(
    'OutboundCampaignContact',
    'campaign',
    { cascade: true }
  )
  contacts: any[];

  @OneToMany('OutboundCampaignCall', 'campaign', {
    cascade: true,
  })
  calls: any[];

  @OneToMany('OutboundCampaignSchedule', 'campaign', {
    cascade: true,
  })
  schedules: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ name: 'paused_at', nullable: true })
  pausedAt: Date;
}
