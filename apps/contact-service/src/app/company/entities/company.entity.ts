import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Contact } from '../../contact/entities/contact.entity';

// Match existing database schema with camelCase column names
@Entity('company')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ name: 'legalName', length: 50, nullable: true })
  legalName?: string;

  @Column({ length: 20, nullable: true })
  inn?: string;

  @Column({ length: 20, nullable: true })
  kpp?: string;

  @Column({ length: 20, nullable: true })
  ogrn?: string;

  @Column({ nullable: true })
  industry?: string;

  @Column({ nullable: true })
  size?: string;

  @Column({ length: 255, nullable: true })
  website?: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ length: 100, nullable: true })
  email?: string;

  @Column({ length: 500, nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 100, nullable: true })
  region?: string;

  @Column({ length: 100, nullable: true })
  country?: string;

  @Column({ name: 'postalCode', length: 20, nullable: true })
  postalCode?: string;

  @Column({ name: 'employeeCount', nullable: true })
  employeeCount?: number;

  @Column({ name: 'annualRevenue', type: 'decimal', precision: 15, scale: 2, nullable: true })
  annualRevenue?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'isActive', default: true })
  isActive!: boolean;

  @Column({ name: 'isBlacklisted', default: false })
  isBlacklisted!: boolean;

  @Column({ name: 'blacklistReason', type: 'text', nullable: true })
  blacklistReason?: string;

  @Column({ name: 'ownerId', nullable: true })
  ownerId?: string;

  @Column({ length: 100, nullable: true })
  source?: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt!: Date;

  @Column({ name: 'lastContactDate', nullable: true })
  lastContactDate?: Date;

  @Column({ name: 'lastActivityAt', nullable: true })
  lastActivityAt?: Date;

  @Column({ type: 'int', nullable: true })
  rating?: number;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  customFields?: Record<string, unknown>;

  @OneToMany(() => Contact, (contact) => contact.company)
  contacts?: Contact[];
}
