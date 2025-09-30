import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Deal } from '../deal.entity';

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
  DATE_CHANGED = 'date_changed'
}

@Entity('deal_history')
export class DealHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  dealId: string;

  @ManyToOne(() => Deal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dealId' })
  deal: Deal;

  @Column({ nullable: true })
  fieldName: string; // Название поля, которое изменилось

  @Column({ type: 'text', nullable: true })
  oldValue: string; // Старое значение (в виде строки/JSON)

  @Column({ type: 'text', nullable: true })
  newValue: string; // Новое значение (в виде строки/JSON)

  @Column({
    type: 'enum',
    enum: DealChangeType
  })
  changeType: DealChangeType;

  @Column({ nullable: true })
  userId: string; // ID пользователя, который внес изменение

  @Column({ nullable: true })
  userName: string; // Имя пользователя для удобства

  @Column({ type: 'text', nullable: true })
  description: string; // Человекочитаемое описание изменения

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, string | number | boolean> | null; // Дополнительные метаданные

  @CreateDateColumn()
  createdAt: Date;
}