import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lead } from '../lead.entity';

export enum ActivityType {
  EMAIL_SENT = 'email_sent',
  EMAIL_OPENED = 'email_opened',
  EMAIL_CLICKED = 'email_clicked',
  PHONE_CALL_MADE = 'phone_call_made',
  PHONE_CALL_RECEIVED = 'phone_call_received',
  MEETING_SCHEDULED = 'meeting_scheduled',
  MEETING_HELD = 'meeting_held',
  PROPOSAL_SENT = 'proposal_sent',
  PROPOSAL_VIEWED = 'proposal_viewed',
  WEBSITE_VISIT = 'website_visit',
  FORM_SUBMITTED = 'form_submitted',
  DOCUMENT_DOWNLOADED = 'document_downloaded',
  DEMO_REQUESTED = 'demo_requested',
  WEBINAR_ATTENDED = 'webinar_attended',
  STATUS_CHANGED = 'status_changed',
  SCORE_UPDATED = 'score_updated',
  ASSIGNED = 'assigned',
  NOTE_ADDED = 'note_added',
  TASK_CREATED = 'task_created',
  TASK_COMPLETED = 'task_completed'
}

@Entity('lead_activities')
export class LeadActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  leadId: number;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leadId' })
  lead: Lead;

  @Column({
    type: 'enum',
    enum: ActivityType
  })
  type: ActivityType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  userId: string; // ID пользователя, который выполнил действие

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, string | number | boolean>; // Дополнительные данные

  @Column({ type: 'int', nullable: true })
  scorePoints: number; // Количество баллов, добавленных за это действие

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  source: string; // Источник активности (website, email, phone, etc.)

  @CreateDateColumn()
  createdAt: Date;
}
