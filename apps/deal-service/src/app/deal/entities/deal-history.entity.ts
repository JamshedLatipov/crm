import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum DealChangeType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  STAGE_MOVED = 'stage_moved',
  ASSIGNED = 'assigned',
  AMOUNT_CHANGED = 'amount_changed',
  PROBABILITY_CHANGED = 'probability_changed',
  WON = 'won',
  LOST = 'lost',
  REOPENED = 'reopened',
  NOTE_ADDED = 'note_added',
  CONTACT_LINKED = 'contact_linked',
  COMPANY_LINKED = 'company_linked',
  LEAD_LINKED = 'lead_linked',
  DATE_CHANGED = 'date_changed',
}

@Entity('deal_history')
export class DealHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  dealId!: string;

  @Column({ nullable: true })
  fieldName?: string;

  @Column({ type: 'text', nullable: true })
  oldValue?: string;

  @Column({ type: 'text', nullable: true })
  newValue?: string;

  @Column({
    type: 'enum',
    enum: DealChangeType,
  })
  changeType!: DealChangeType;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  userName?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, string | number | boolean> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
