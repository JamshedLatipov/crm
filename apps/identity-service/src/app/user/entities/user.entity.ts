import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';

/**
 * User entity for Identity Service
 * This is the source of truth for user data
 */
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
  roles: string[];

  @Column({ default: true })
  isActive: boolean;

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

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'json', nullable: true })
  skills: string[];

  @Column({ type: 'json', nullable: true })
  territories: string[];

  @Column({ type: 'int', default: 0 })
  currentLeadsCount: number;

  @Column({ type: 'int', default: 15 })
  maxLeadsCapacity: number;

  @Column({ type: 'int', default: 0 })
  currentDealsCount: number;

  @Column({ type: 'int', default: 20 })
  maxDealsCapacity: number;

  @Column({ type: 'int', default: 0 })
  currentTasksCount: number;

  @Column({ type: 'int', default: 30 })
  maxTasksCapacity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  conversionRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'int', default: 0 })
  totalLeadsHandled: number;

  @Column({ nullable: true })
  managerID: number;

  @Column({ default: true })
  isAvailableForAssignment: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @Column({ type: 'varchar', length: 100, default: 'Asia/Dushanbe' })
  timezone: string;

  @Column({ type: 'varchar', name: 'sip_endpoint_id', length: 40, nullable: true })
  sipEndpointId: string | null;

  // Computed properties
  get fullName(): string {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.username;
  }

  get workloadPercentage(): number {
    const leadPct = this.maxLeadsCapacity > 0 ? (this.currentLeadsCount / this.maxLeadsCapacity) * 100 : 0;
    const dealPct = this.maxDealsCapacity > 0 ? (this.currentDealsCount / this.maxDealsCapacity) * 100 : 0;
    const taskPct = this.maxTasksCapacity > 0 ? (this.currentTasksCount / this.maxTasksCapacity) * 100 : 0;
    return Math.round((leadPct + dealPct + taskPct) / 3);
  }
}
