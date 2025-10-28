import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Lead } from '../../leads/lead.entity';

export enum PromoCompanyStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PromoCompanyType {
  PROMOTER = 'promoter',
  AFFILIATE = 'affiliate',
  PARTNER = 'partner'
}

@Entity('promo_companies')
export class PromoCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PromoCompanyType,
    default: PromoCompanyType.PROMOTER
  })
  type: PromoCompanyType;

  @Column({
    type: 'enum',
    enum: PromoCompanyStatus,
    default: PromoCompanyStatus.DRAFT
  })
  status: PromoCompanyStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  budget: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  spent: number;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ type: 'json', nullable: true })
  targetCriteria: {
    industries?: string[];
    countries?: string[];
    leadSources?: string[];
    scoreMin?: number;
    scoreMax?: number;
  };

  @Column({ type: 'int', default: 0 })
  leadsReached: number;

  @Column({ type: 'int', default: 0 })
  leadsConverted: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Связь с лидами, которых таргетирует эта промо-компания
  @ManyToMany(() => Lead, lead => lead.promoCompanies)
  @JoinTable({
    name: 'promo_company_leads',
    joinColumn: { name: 'promoCompanyId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'leadId', referencedColumnName: 'id' }
  })
  leads: Lead[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}