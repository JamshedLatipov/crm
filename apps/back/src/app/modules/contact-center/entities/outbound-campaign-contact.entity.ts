import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OutboundCampaign } from './outbound-campaign.entity';

export enum ContactStatus {
  PENDING = 'pending',
  CALLING = 'calling',
  SENDING = 'sending', // для мессенджеров
  ANSWERED = 'answered',
  DELIVERED = 'delivered', // сообщение доставлено
  READ = 'read', // сообщение прочитано
  BUSY = 'busy',
  NO_ANSWER = 'no_answer',
  FAILED = 'failed',
  COMPLETED = 'completed',
  EXCLUDED = 'excluded',
}

@Entity('outbound_campaign_contacts')
export class OutboundCampaignContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id' })
  @Index()
  campaignId: string;

  @ManyToOne(() => OutboundCampaign, (campaign) => campaign.contacts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: OutboundCampaign;

  @Column({ length: 50 })
  @Index()
  phone: string;

  @Column({ length: 255, nullable: true })
  name: string;

  @Column({ type: 'jsonb', default: {}, name: 'custom_data' })
  customData: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.PENDING,
  })
  @Index()
  status: ContactStatus;

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'last_call_at', nullable: true })
  lastCallAt: Date;

  @Column({ name: 'next_attempt_at', nullable: true })
  @Index()
  nextAttemptAt: Date;

  @OneToMany('OutboundCampaignCall', 'contact')
  calls: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
