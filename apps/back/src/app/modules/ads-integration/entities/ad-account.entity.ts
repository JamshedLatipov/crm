import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { AdCampaign } from './ad-campaign.entity';

@Entity('ad_accounts')
export class AdAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  platform: string; // google | facebook | other

  @Column({ nullable: true })
  accountId: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'json', nullable: true })
  raw: any;

  @Column({ nullable: true })
  accessToken?: string;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  tokenExpiresAt?: Date;

  @Column({ nullable: true })
  userId?: number; // optional linkage to CRM user

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => AdCampaign, campaign => campaign.account)
  campaigns?: AdCampaign[];
}
