import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { AdCampaign } from './ad-campaign.entity';

@Entity('ad_campaign_metrics')
export class AdCampaignMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AdCampaign, campaign => (campaign as any).metrics)
  campaign: AdCampaign;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'int', default: 0 })
  impressions: number;

  @Column({ type: 'int', default: 0 })
  clicks: number;

  @Column({ type: 'int', default: 0 })
  leads: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost: number;

  @CreateDateColumn()
  createdAt: Date;
}
