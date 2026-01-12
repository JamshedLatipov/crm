import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Contact } from '../../contacts/contact.entity';
import { Deal } from '../../deals/deal.entity';
import { Lead } from '../../leads/lead.entity';

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small', // 1-50 сотрудников
  MEDIUM = 'medium', // 51-250 сотрудников  
  LARGE = 'large', // 251-1000 сотрудников
  ENTERPRISE = 'enterprise' // 1000+ сотрудников
}

export enum CompanyType {
  CLIENT = 'client',
  PROSPECT = 'prospect',
  PARTNER = 'partner',
  COMPETITOR = 'competitor',
  VENDOR = 'vendor'
}

export enum Industry {
  TECHNOLOGY = 'technology',
  FINANCE = 'finance',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  RETAIL = 'retail',
  MANUFACTURING = 'manufacturing',
  REAL_ESTATE = 'real_estate',
  CONSULTING = 'consulting',
  MEDIA = 'media',
  GOVERNMENT = 'government',
  OTHER = 'other'
}

@Entity()
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 50, nullable: true })
  legalName: string; // Полное юридическое название

  @Column({ length: 20, nullable: true })
  inn: string; // ИНН

  @Column({ length: 20, nullable: true })
  kpp: string; // КПП

  @Column({ length: 20, nullable: true })
  ogrn: string; // ОГРН

  @Column({ type: 'enum', enum: CompanyType, default: CompanyType.PROSPECT })
  type: CompanyType;

  @Column({ type: 'enum', enum: Industry, nullable: true })
  industry: Industry;

  @Column({ type: 'enum', enum: CompanySize, nullable: true })
  size: CompanySize;

  @Column({ type: 'int', nullable: true })
  employeeCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  annualRevenue: number; // Годовой оборот

  @Column({ length: 255, nullable: true })
  website: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  email: string;

  // Адрес
  @Column({ length: 500, nullable: true })
  address: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ length: 100, nullable: true })
  region: string; // Область/край

  @Column({ length: 100, nullable: true })
  country: string;

  @Column({ length: 20, nullable: true })
  postalCode: string;

  // Социальные сети и дополнительная информация
  @Column({ type: 'json', nullable: true })
  socialMedia: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
    vk?: string;
    telegram?: string;
  };

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string; // Внутренние заметки

  // Теги для группировки и поиска
  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  // Статус активности
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isBlacklisted: boolean;

  @Column({ type: 'text', nullable: true })
  blacklistReason: string;

  // Даты важных событий
  @Column({ type: 'timestamp', nullable: true })
  foundedDate: Date; // Дата основания

  @Column({ type: 'timestamp', nullable: true })
  firstContactDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastContactDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityDate: Date;

  @Column({ type: 'jsonb', nullable: true })
  customFields?: Record<string, unknown>;

  // Связи
  @OneToMany(() => Contact, contact => contact.company, { cascade: true })
  contacts: Contact[];

    // Связи
  @OneToMany(() => Lead, lead => lead.company, { cascade: true })
  leads: Lead[];

  @OneToMany(() => Deal, deal => deal.company, { cascade: true })
  deals: Deal[];

  // Рейтинг компании (1-5 звезд)
  @Column({ type: 'int', default: 0 })
  rating: number;

  // Источник информации о компании
  @Column({ length: 100, nullable: true })
  source: string; // 'website', 'referral', 'cold_call', 'linkedin', etc.

  // Владелец/ответственный менеджер
  @Column({ type: 'uuid', nullable: true })
  ownerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
