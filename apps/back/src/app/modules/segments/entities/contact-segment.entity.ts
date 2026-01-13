import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/user.entity';

/**
 * Универсальный фильтр для сегментации контактов
 */
export interface SegmentFilter {
  field: string; // Поле для фильтрации: 'name', 'phone', 'email', 'company', 'dealStatus', etc.
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
  value: any; // Значение для сравнения (может быть null для is_null/is_not_null)
  // Логический оператор для связи с предыдущим условием (не применяется к первому условию)
  logicOperator?: 'AND' | 'OR';
}

/**
 * Condition wrapper - обертка для условия или группы с индивидуальным логическим оператором
 */
export interface FilterCondition {
  // Условие или группа
  item: SegmentFilter | FilterGroup;
  // Логический оператор для связи с предыдущим условием (не применяется к первому)
  logicOperator: 'AND' | 'OR';
}

/**
 * Filter group with support for nested groups (recursive structure)
 * Теперь каждое условие имеет свой логический оператор
 */
export interface FilterGroup {
  // Deprecated: используется только для обратной совместимости
  logic?: 'AND' | 'OR';
  // Массив условий с индивидуальными операторами
  conditions: Array<FilterCondition>;
}

/**
 * Type guard to check if condition is a FilterGroup
 */
export function isFilterGroup(item: SegmentFilter | FilterGroup): item is FilterGroup {
  return 'conditions' in item && Array.isArray((item as FilterGroup).conditions);
}

/**
 * Метаданные сегмента
 */
export interface SegmentMetadata {
  lastCalculated?: Date;
  estimatedSize?: number;
  tags?: string[];
  [key: string]: any;
}

/**
 * Типы использования сегмента
 */
export enum SegmentUsageType {
  SMS = 'sms',
  CAMPAIGN = 'campaign',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  GENERAL = 'general',
}

/**
 * Универсальная сущность для сегментации контактов
 * Используется в SMS-рассылках, звонках, email-кампаниях и т.д.
 */
@Entity('contact_segments')
@Index(['isActive', 'usageType'])
@Index(['createdBy'])
export class ContactSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Тип использования сегмента (SMS, Campaign, Email, etc.)
   * Позволяет фильтровать сегменты по назначению
   */
  @Column({ 
    type: 'varchar', 
    length: 50, 
    default: SegmentUsageType.GENERAL 
  })
  @Index()
  usageType: SegmentUsageType;

  /**
   * Динамические фильтры для выборки контактов
   * Поддерживает как старый формат (массив фильтров), так и новый (группы с вложенностью)
   * Старый формат: SegmentFilter[] - массив условий с filterLogic для всех
   * Новый формат: FilterGroup - рекурсивная структура с индивидуальной логикой для каждой группы
   */
  @Column({ type: 'jsonb', default: { logic: 'AND', conditions: [] } })
  filters: SegmentFilter[] | FilterGroup;

  /**
   * Логика объединения фильтров (AND/OR)
   * DEPRECATED: Используется только для обратной совместимости со старым форматом
   * В новом формате логика задается внутри FilterGroup
   */
  @Column({ type: 'varchar', length: 3, default: 'AND', nullable: true })
  filterLogic?: 'AND' | 'OR';

  /**
   * Кэшированное количество контактов
   * Обновляется при пересчете сегмента
   */
  @Column({ type: 'int', default: 0 })
  contactsCount: number;

  /**
   * Дополнительные метаданные
   * Может содержать любые дополнительные данные
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: SegmentMetadata;

  /**
   * Активен ли сегмент
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Динамический ли сегмент
   * Если true - пересчитывается автоматически
   * Если false - статический снимок на момент создания
   */
  @Column({ type: 'boolean', default: false })
  isDynamic: boolean;

  /**
   * ID создателя сегмента
   */
  @Column({ name: 'created_by' })
  createdBy: number;

  /**
   * Связь с пользователем-создателем
   */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Дата последнего пересчета количества контактов
   */
  @Column({ name: 'last_calculated_at', type: 'timestamp', nullable: true })
  lastCalculatedAt: Date;
}
