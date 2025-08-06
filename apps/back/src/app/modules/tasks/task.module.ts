import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TaskHistory } from './task-history.entity';
import { TaskComment } from './task-comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskHistory, TaskComment])],
  providers: [TaskService],
  controllers: [TaskController],
  exports: [TaskService],
})
export class TaskModule {}
