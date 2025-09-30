import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Lead } from '../lead.entity';

export enum ChangeType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  SCORED = 'scored',
  QUALIFIED = 'qualified',
  CONVERTED = 'converted',
  NOTE_ADDED = 'note_added',
  CONTACT_ADDED = 'contact_added',
  TAG_ADDED = 'tag_added',
  TAG_REMOVED = 'tag_removed',
  FOLLOW_UP_SCHEDULED = 'follow_up_scheduled'
}

@Entity('lead_history')
export class LeadHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @Column({ nullable: true })
  fieldName: string; // Название поля, которое изменилось

  @Column({ type: 'text', nullable: true })
  oldValue: string; // Старое значение (в виде строки/JSON)

  @Column({ type: 'text', nullable: true })
  newValue: string; // Новое значение (в виде строки/JSON)

  @Column({
    type: 'enum',
    enum: ChangeType
  })
  changeType: ChangeType;

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