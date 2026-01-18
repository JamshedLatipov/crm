import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StoOrderZone, StoOrderStatus, StoOrderPriority } from '../enums';

@Entity('sto_orders')
export class StoOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  queueNumber: number; // Глобальный номер для display

  @Column({ type: 'int' })
  queueNumberInZone: number; // Номер внутри зоны

  @Column({ type: 'enum', enum: StoOrderZone })
  zone: StoOrderZone;

  // Vehicle info
  @Column()
  vehicleMake: string;

  @Column()
  vehicleModel: string;

  @Column({ type: 'int' })
  vehicleYear: number;

  @Column()
  licensePlate: string;

  @Column({ nullable: true })
  vin: string;

  // Customer reference (from CRM or customer_cache)
  @Column({ nullable: true })
  customerId: string;

  @Column({ nullable: true })
  customerName: string;

  @Column()
  customerPhone: string;

  @Column({ nullable: true })
  customerEmail: string;

  // Work details
  @Column({ type: 'text' })
  workDescription: string;

  @Column()
  workType: string; // 'maintenance' | 'repair' | 'diagnostic' | 'bodywork'

  @Column({ type: 'int' })
  estimatedDurationMinutes: number;

  @Column({ type: 'enum', enum: StoOrderPriority, default: StoOrderPriority.NORMAL })
  priority: StoOrderPriority;

  // Status
  @Column({ type: 'enum', enum: StoOrderStatus, default: StoOrderStatus.WAITING })
  status: StoOrderStatus;

  @Column({ nullable: true })
  bayNumber: string;

  @Column({ nullable: true })
  mechanicId: string;

  @Column({ nullable: true })
  mechanicName: string;

  @Column('jsonb', { nullable: true })
  requiredParts: Array<{ itemId: string; name: string; quantity: number }>;

  @Column({ nullable: true })
  blockedReason: string;

  // Pricing
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ default: 'TJS' })
  currency: string;

  // QR Self-Service
  @Column({ nullable: true })
  qrCodeId: string;

  @Column({ default: false })
  isSelfService: boolean; // Создан через QR

  // Timestamps
  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Computed properties (not stored in DB)
  get waitingMinutes(): number {
    if (this.status === StoOrderStatus.IN_PROGRESS || this.status === StoOrderStatus.COMPLETED) {
      return 0;
    }
    const now = new Date();
    return Math.floor((now.getTime() - this.createdAt.getTime()) / 60000);
  }

  get startedMinutesAgo(): number | null {
    if (!this.startedAt) return null;
    const now = new Date();
    return Math.floor((now.getTime() - this.startedAt.getTime()) / 60000);
  }
}
