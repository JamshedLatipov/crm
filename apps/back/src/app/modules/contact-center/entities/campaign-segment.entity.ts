import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/user.entity';

export interface CampaignSegmentFilter {
  field: string; // 'name', 'phone', 'email', 'company', 'dealStatus', etc.
  operator: 
    | 'equals' 
    | 'not_equals' 
    | 'contains' 
    | 'not_contains' 
    | 'starts_with'
    | 'ends_with'
    | 'greater' 
    | 'less' 
    | 'between' 
    | 'in' 
    | 'not_in'
    | 'is_null'
    | 'is_not_null';
  value: any;
}

export interface CampaignSegmentMetadata {
  lastCalculated?: Date;
  estimatedSize?: number;
  description?: string;
}

@Entity('campaign_segments')
export class CampaignSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Динамические фильтры для выборки контактов
  @Column({ type: 'jsonb', default: [] })
  filters: CampaignSegmentFilter[];

  // Логика объединения фильтров (AND/OR)
  @Column({ type: 'varchar', length: 3, default: 'AND' })
  filterLogic: 'AND' | 'OR';

  // Кэшированное количество контактов
  @Column({ type: 'int', default: 0 })
  contactsCount: number;

  // Дополнительные метаданные
  @Column({ type: 'jsonb', nullable: true })
  metadata: CampaignSegmentMetadata;

  // Активен ли сегмент
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Динамический ли сегмент (пересчитывается автоматически)
  @Column({ type: 'boolean', default: false })
  isDynamic: boolean;

  @Column({ name: 'created_by' })
  createdBy: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_calculated_at', type: 'timestamp', nullable: true })
  lastCalculatedAt: Date;
}
