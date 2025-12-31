import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Contact } from './contact.entity';

export enum ContactActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  NOTE = 'note',
  TASK = 'task',
  STATUS_CHANGE = 'status_change',
  SYSTEM = 'system',
}

@Entity('contact_activities')
export class ContactActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'contact_id' })
  contactId!: string;

  @ManyToOne(() => Contact, (contact) => contact.activities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contact_id' })
  contact?: Contact;

  @Column({
    type: 'enum',
    enum: ContactActivityType,
  })
  type!: ContactActivityType;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'user_id', nullable: true })
  performedById?: string;

  @Column({ name: 'user_name', nullable: true })
  performedByName?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
