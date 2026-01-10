import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task, TaskType, Assignment } from './entities';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TaskTypeController } from './types/task-type.controller';
import { TaskTypeService } from './types/task-type.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskType, Assignment])],
  controllers: [TaskController, TaskTypeController],
  providers: [TaskService, TaskTypeService],
  exports: [TaskService, TaskTypeService],
})
export class TaskModule {}
