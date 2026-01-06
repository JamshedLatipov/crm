import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';

export interface SegmentFilter {
  field: string; // Например: 'leadStatus', 'dealAmount', 'lastContactDate'
  operator: 
    | 'equals' 
    | 'notEquals' 
    | 'not_equals' 
    | 'contains' 
    | 'notContains'
    | 'not_contains' 
    | 'startsWith'
    | 'starts_with'
    | 'endsWith'
    | 'ends_with'
    | 'greater' 
    | 'less' 
    | 'between' 
    | 'in' 
    | 'notIn'
    | 'not_in';
  value: any;
}

export interface SegmentMetadata {
  lastCalculated?: Date;
  estimatedSize?: number;
  description?: string;
}

@Entity('sms_segments')
export class SmsSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  // Динамические фильтры для выборки контактов
  @Column('jsonb')
  filters: SegmentFilter[];

  // Логика объединения фильтров
  @Column({ default: 'AND' })
  filterLogic: 'AND' | 'OR';

  // Кэшированное количество контактов
  @Column({ default: 0 })
  contactsCount: number;

  // Дополнительные метаданные
  @Column('jsonb', { nullable: true })
  metadata: SegmentMetadata;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDynamic: boolean; // Пересчитывается ли сегмент автоматически

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastCalculatedAt: Date;
}
