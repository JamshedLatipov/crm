import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Task } from './task.entity';
import { User } from '../../modules/user/user.entity';

@Entity('task_comments')
export class TaskComment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, { nullable: false })
  task: Task;

  @ManyToOne(() => User, { nullable: false })
  author: User;

  @Column()
  text: string;

  @CreateDateColumn()
  createdAt: Date;
}
