import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sto_message_templates')
export class StoMessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  channel: string; // 'sms' | 'whatsapp' | 'email' | 'telegram'

  @Column({ nullable: true })
  subject: string; // For email

  @Column({ type: 'text' })
  body: string; // Template with {{variables}}

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
