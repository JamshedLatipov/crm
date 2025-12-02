import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentController } from './controllers/assignment.controller';
import { AssignmentService } from './services/assignment.service';
import { Assignment } from './entities/assignment.entity';
import { User } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notifications/notification.module';
import { UserActivityModule } from '../user-activity/user-activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, User]),
    NotificationModule,
    UserActivityModule,
    UserModule
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService]
})
export class SharedModule {}