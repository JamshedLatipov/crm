import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Tree, TreeChildren, TreeParent } from 'typeorm';
import { CallScriptCategory } from './call-script-category.entity';

@Entity('call_scripts')
@Tree('materialized-path')
export class CallScript {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => CallScriptCategory, { eager: true })
  @JoinColumn({ name: 'categoryId' })
  category?: CallScriptCategory;

  @Column({ nullable: true })
  categoryId?: string;

  @TreeParent()
  parent?: CallScript;

  @Column({ nullable: true })
  parentId?: string;

  @TreeChildren()
  children?: CallScript[];

  @Column({ type: 'simple-array', nullable: true })
  steps?: string[];

  @Column({ type: 'simple-array', nullable: true })
  questions?: string[];

  @Column({ type: 'simple-array', nullable: true })
  tips?: string[];

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 0 })
  sortOrder!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
