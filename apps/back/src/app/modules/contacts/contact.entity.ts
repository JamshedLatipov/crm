import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Company } from '../companies/entities/company.entity';
import { Deal } from '../deals/deal.entity';

export enum ContactType {
  PERSON = 'person',
  COMPANY = 'company',
}

export enum ContactSource {
  WEBSITE = 'website',
  PHONE = 'phone',
  EMAIL = 'email',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISING = 'advertising',
  IMPORT = 'import',
  OTHER = 'other',
}

@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ContactType,
    default: ContactType.PERSON,
  })
  type: ContactType;

  // Основная информация
  @Column()
  name: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  middleName?: string;

  @Column({ nullable: true })
  position?: string; // Должность

  // Связь с компанией (используем relation; FK column will be managed by TypeORM)
  @ManyToOne(() => Company, company => company.contacts, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  // Контактная информация
  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  mobilePhone?: string;

  @Column({ nullable: true })
  workPhone?: string;

  @Column({ nullable: true })
  website?: string;

  // Адрес
  @Column('json', { nullable: true })
  address?: {
    country?: string;
    region?: string;
    city?: string;
    street?: string;
    building?: string;
    apartment?: string;
    postalCode?: string;
  };

  // Социальные сети
  @Column('json', { nullable: true })
  socialMedia?: {
    telegram?: string;
    whatsapp?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    vk?: string;
  };

  // Источник контакта
  @Column({
    type: 'enum',
    enum: ContactSource,
    default: ContactSource.OTHER,
  })
  source: ContactSource;

  // Ответственный менеджер
  @Column({ nullable: true })
  assignedTo?: string;

  // Теги для категоризации
  @Column('simple-array', { nullable: true })
  tags?: string[];

  // Дополнительная информация
  @Column('text', { nullable: true })
  notes?: string;

  @Column('json', { nullable: true })
  customFields?: Record<string, unknown>;

  // Статус активности
  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isBlacklisted: boolean;

  @Column('text', { nullable: true })
  blacklistReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  lastContactDate?: Date;

  // Связи
  @OneToMany(() => Deal, deal => deal.contact)
  deals?: Deal[];
}
