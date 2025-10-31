import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CallScriptCategory } from './call-script-category.entity';

export { CallScriptCategory };

@Entity('call_scripts')
export class CallScript {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => CallScriptCategory, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category: CallScriptCategory;

  @Column()
  categoryId: string;

  @Column({ type: 'simple-array', nullable: true })
  steps: string[];

  @Column({ type: 'simple-array', nullable: true })
  questions: string[];

  @Column({ type: 'simple-array', nullable: true })
  tips: string[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}