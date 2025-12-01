import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { PsEndpoint } from '../calls/entities/ps-endpoint.entity';

export enum UserRole {
  ADMIN = 'admin',
  SALES_MANAGER = 'sales_manager',
  SENIOR_MANAGER = 'senior_manager',
  TEAM_LEAD = 'team_lead',
  ACCOUNT_MANAGER = 'account_manager',
  CLIENT = 'client'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  @Exclude()
  password: string;

  @Column('simple-array')
  roles: string[]; // e.g. ['admin', 'manager', 'client']

  @Column({ default: true })
  isActive: boolean;

  // Additional fields for lead management
  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ type: 'json', nullable: true })
  skills: string[]; // Навыки/специализации

  @Column({ type: 'json', nullable: true })
  territories: string[]; // Территории/регионы

  @Column({ type: 'int', default: 0 })
  currentLeadsCount: number; // Текущее количество активных лидов

  @Column({ type: 'int', default: 15 })
  maxLeadsCapacity: number; // Максимальная вместимость лидов

  // Workload tracking for deals
  @Column({ type: 'int', default: 0 })
  currentDealsCount: number;

  @Column({ type: 'int', default: 20 })
  maxDealsCapacity: number;

  // Workload tracking for tasks
  @Column({ type: 'int', default: 0 })
  currentTasksCount: number;

  @Column({ type: 'int', default: 30 })
  maxTasksCapacity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number; // Процент конверсии

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRevenue: number; // Общая выручка

  @Column({ type: 'int', default: 0 })
  totalLeadsHandled: number; // Общее количество обработанных лидов

  @Column({ nullable: true })
  managerID: number; // ID руководителя

  @Column({ default: true })
  isAvailableForAssignment: boolean; // Доступен для назначения новых лидов

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastActiveAt: Date; // Последняя активность

  // SIP endpoint linkage (optional)
  @Column({ name: 'sip_endpoint_id', length: 40, nullable: true })
  sipEndpointId?: string | null;

  @OneToOne(() => PsEndpoint, { nullable: true })
  @JoinColumn({ name: 'sip_endpoint_id', referencedColumnName: 'id' })
  sipEndpoint?: PsEndpoint | null;

  // Helper methods
  get fullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.username;
  }

  get workloadPercentage(): number {
    return this.maxLeadsCapacity > 0 ? (this.currentLeadsCount / this.maxLeadsCapacity) * 100 : 0;
  }

  get isOverloaded(): boolean {
    return this.currentLeadsCount > this.maxLeadsCapacity;
  }
}
