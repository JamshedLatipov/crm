import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum CommentEntityType {
  DEAL = 'deal',
  LEAD = 'lead',
  CONTACT = 'contact',
  COMPANY = 'company',
  TASK = 'task'
}

@Entity('comments')
@Index(['entityType', 'entityId']) // Составной индекс для быстрого поиска комментариев по сущности
@Index(['userId']) // Индекс для поиска комментариев пользователя
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  text: string;

  @Column({
    type: 'enum',
    enum: CommentEntityType,
    comment: 'Тип сущности, к которой относится комментарий'
  })
  entityType: CommentEntityType;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'ID сущности, к которой относится комментарий'
  })
  entityId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'ID пользователя, создавшего комментарий'
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Имя пользователя, создавшего комментарий'
  })
  userName: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Дата создания комментария'
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
    comment: 'Дата последнего обновления комментария'
  })
  updatedAt: Date;

  @Column({
    type: 'boolean',
    default: false,
    comment: 'Помечен ли комментарий как удаленный (мягкое удаление)'
  })
  isDeleted: boolean;
}