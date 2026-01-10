import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface SegmentFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between';
  value: any;
}

@Entity('segments')
export class Segment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: [] })
  filters: SegmentFilter[];

  @Column({ default: 'AND' })
  filterLogic: 'AND' | 'OR';

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDynamic: boolean;

  @Column({ default: 0 })
  contactsCount: number;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
