import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ad_lead_records')
export class AdLeadRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  platform: string; // google | facebook | other

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  campaign: string;

  @Column({ nullable: true })
  campaignName: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'json', nullable: true })
  raw: any;

  @Column({ type: 'json', nullable: true })
  customFields: any;

  @CreateDateColumn()
  createdAt: Date;
}
