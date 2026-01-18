import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('customer_cache')
export class CustomerCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  crmContactId: string; // Если синхронизирован с CRM

  @Column()
  phone: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: false })
  isVip: boolean; // Синхронизируется из CRM tags

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date; // Последняя синхронизация с CRM

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
