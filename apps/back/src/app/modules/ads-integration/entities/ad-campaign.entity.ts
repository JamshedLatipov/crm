import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { AdAccount } from './ad-account.entity';
import { AdCampaignMetric } from './ad-campaign-metric.entity';

@Entity('ad_campaigns')
export class AdCampaign {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  campaignId: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  status: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  budget?: number;

  @Column({ type: 'json', nullable: true })
  raw: any;

  @ManyToOne(() => AdAccount, account => account.campaigns)
  account: AdAccount;

  @OneToMany(() => AdCampaignMetric, m => m.campaign)
  metrics?: AdCampaignMetric[];

  @CreateDateColumn()
  createdAt: Date;
}
