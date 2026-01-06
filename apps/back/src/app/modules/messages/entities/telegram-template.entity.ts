import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('telegram_templates')
export class TelegramTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 100, default: 'MARKETING' })
  category: string;

  @Column({ type: 'json', nullable: true })
  variables?: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  mediaUrl?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    tags?: string[];
    buttons?: Array<{ text: string; url?: string; callbackData?: string }>; // Inline кнопки
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
