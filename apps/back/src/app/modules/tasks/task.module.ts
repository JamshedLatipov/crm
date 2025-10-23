import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { TaskHistory } from './task-history.entity';
import { TaskComment } from './task-comment.entity';
import { TaskReminder } from './reminder.entity';
import { ReminderProcessor } from './reminder.processor';
import { NotificationModule } from '../notifications/notification.module';
import { UserModule } from '../user/user.module';
import { TaskType } from './entities/task-type.entity';
import { TaskTypeService } from './services/task-type.service';
import { TaskTypeController } from './controllers/task-type.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskHistory, TaskComment, TaskReminder, TaskType]),
    NotificationModule,
    UserModule,
  ],
  providers: [TaskService, ReminderProcessor, TaskTypeService],
  controllers: [TaskController, TaskTypeController],
  exports: [TaskService, TaskTypeService],
})
export class TaskModule {}
