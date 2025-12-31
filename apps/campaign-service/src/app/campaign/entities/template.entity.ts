import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TemplateType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
}

@Entity('campaign_templates')
export class Template {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TemplateType,
    default: TemplateType.EMAIL,
  })
  type: TemplateType;

  @Column({ nullable: true })
  subject: string; // For email

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  htmlBody: string; // For email HTML version

  @Column({ type: 'jsonb', nullable: true })
  variables: string[]; // Available merge fields

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  createdBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
