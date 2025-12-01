import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentController } from './controllers/assignment.controller';
import { AssignmentService } from './services/assignment.service';
import { Assignment } from './entities/assignment.entity';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { NotificationModule } from '../notifications/notification.module';
import { UserActivityModule } from '../user-activity/user-activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, User]),
    NotificationModule,
    UserActivityModule
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService, UserService],
  exports: [AssignmentService]
})
export class SharedModule {}