import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SettingCategory {
  SMS = 'sms',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  WEBHOOK = 'webhook',
  CAMPAIGN = 'campaign',
  NOTIFICATION = 'notification',
  FEATURE = 'feature',
  GENERAL = 'general',
}

@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({
    type: 'enum',
    enum: SettingCategory,
    default: SettingCategory.GENERAL,
  })
  category: SettingCategory;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  isEncrypted: boolean;

  @Column({ type: 'boolean', default: false })
  isSecret: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
