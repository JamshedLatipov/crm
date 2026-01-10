import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CallScript } from './call-script.entity';

@Entity('call_script_categories')
export class CallScriptCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100, unique: true, nullable: true })
  name?: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({ default: '#6b7280' })
  color!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => CallScript, script => script.category)
  scripts?: CallScript[];
}
