import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Tree, TreeChildren, TreeParent } from 'typeorm';

export enum CommentEntityType {
  LEAD = 'lead',
  DEAL = 'deal',
  CONTACT = 'contact',
  COMPANY = 'company',
  TASK = 'task',
  CALL = 'call',
  CAMPAIGN = 'campaign',
}

@Entity('comments')
@Tree('closure-table')
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'enum', enum: CommentEntityType, name: 'entity_type' })
  entityType!: CommentEntityType;

  @Column({ name: 'entity_id' })
  entityId!: number;

  @Column({ name: 'author_id' })
  authorId!: number;

  @Column({ name: 'author_name', nullable: true })
  authorName?: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  mentions?: number[]; // User IDs mentioned

  @Column({ type: 'jsonb', nullable: true, default: [] })
  attachments?: { name: string; url: string; type: string; size: number }[];

  @Column({ name: 'is_internal', default: false })
  isInternal!: boolean;

  @Column({ name: 'is_pinned', default: false })
  isPinned!: boolean;

  @Column({ name: 'is_edited', default: false })
  isEdited!: boolean;

  @Column({ name: 'edited_at', nullable: true })
  editedAt?: Date;

  @TreeChildren()
  replies?: Comment[];

  @TreeParent()
  parent?: Comment;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
