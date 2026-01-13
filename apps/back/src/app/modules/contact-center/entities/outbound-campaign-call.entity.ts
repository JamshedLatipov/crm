import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OutboundCampaign } from './outbound-campaign.entity';
import { OutboundCampaignContact } from './outbound-campaign-contact.entity';
import { User } from '../../user/user.entity';

export enum CallOutcome {
  ANSWERED = 'answered',
  BUSY = 'busy',
  NO_ANSWER = 'no_answer',
  FAILED = 'failed',
  REJECTED = 'rejected',
  TRANSFERRED = 'transferred',
  CANCELLED = 'cancelled',
}

@Entity('outbound_campaign_calls')
export class OutboundCampaignCall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id' })
  @Index()
  campaignId: string;

  @ManyToOne(() => OutboundCampaign, (campaign) => campaign.calls, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: OutboundCampaign;

  @Column({ name: 'contact_id' })
  @Index()
  contactId: string;

  @ManyToOne(() => OutboundCampaignContact, (contact) => contact.calls, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contact_id' })
  contact: OutboundCampaignContact;

  @Column({ name: 'call_id', nullable: true })
  @Index()
  callId: string;

  @Column({ type: 'enum', enum: CallOutcome })
  outcome: CallOutcome;

  @Column({ default: 0 })
  duration: number;

  @Column({ name: 'wait_time', default: 0 })
  waitTime: number;

  @Column({ name: 'answered_at', nullable: true })
  answeredAt: Date;

  @Column({ name: 'ended_at', nullable: true })
  endedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'agent_id', nullable: true })
  agentId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column({ name: 'recording_url', nullable: true })
  recordingUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
