import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { ContactActivity } from './contact-activity.entity';

export enum ContactType {
  PERSON = 'person',
  COMPANY = 'company',
}

export enum ContactSource {
  WEBSITE = 'website',
  CALL = 'call',
  EMAIL = 'email',
  REFERRAL = 'referral',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISING = 'advertising',
  IMPORT = 'import',
  OTHER = 'other',
}

// Match existing database schema with camelCase column names
@Entity('contacts')
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ContactType,
    default: ContactType.PERSON,
  })
  type!: ContactType;

  @Column()
  name!: string;

  @Column({ name: 'firstName', nullable: true })
  firstName?: string;

  @Column({ name: 'lastName', nullable: true })
  lastName?: string;

  @Column({ name: 'middleName', nullable: true })
  middleName?: string;

  @Column({ nullable: true })
  position?: string;

  @Column({ name: 'companyId', nullable: true })
  companyId?: string;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'mobilePhone', nullable: true })
  mobilePhone?: string;

  @Column({ name: 'workPhone', nullable: true })
  workPhone?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ type: 'json', nullable: true })
  address?: string;

  @Column({
    type: 'enum',
    enum: ContactSource,
    default: ContactSource.OTHER,
  })
  source!: ContactSource;

  @Column({ name: 'assignedTo', nullable: true })
  assignedTo?: string;

  @Column({ type: 'text', nullable: true })
  tags?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'customFields', type: 'json', nullable: true })
  customFields?: Record<string, unknown>;

  @Column({ name: 'isActive', default: true })
  isActive!: boolean;

  @Column({ name: 'isBlacklisted', default: false })
  isBlacklisted!: boolean;

  @Column({ name: 'blacklistReason', type: 'text', nullable: true })
  blacklistReason?: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt!: Date;

  @Column({ name: 'lastContactDate', type: 'timestamp', nullable: true })
  lastContactDate?: Date;

  @OneToMany(() => ContactActivity, (activity) => activity.contact)
  activities?: ContactActivity[];
}
