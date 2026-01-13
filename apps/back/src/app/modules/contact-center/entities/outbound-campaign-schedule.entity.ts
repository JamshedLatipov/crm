import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OutboundCampaign } from './outbound-campaign.entity';

@Entity('outbound_campaign_schedules')
export class OutboundCampaignSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id' })
  @Index()
  campaignId: string;

  @ManyToOne(() => OutboundCampaign, (campaign) => campaign.schedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: OutboundCampaign;

  @Column({ name: 'day_of_week', type: 'int' }) // 0 = Sunday, 6 = Saturday
  dayOfWeek: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ default: 'UTC', length: 100 })
  timezone: string;

  @Column({ default: true })
  enabled: boolean;
}
