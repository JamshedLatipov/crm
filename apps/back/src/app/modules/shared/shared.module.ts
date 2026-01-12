import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentController } from './controllers/assignment.controller';
import { AssignmentService } from './services/assignment.service';
import { UniversalFilterService } from './services/universal-filter.service';
import { Assignment } from './entities/assignment.entity';
import { User } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notifications/notification.module';
import { UserActivityModule } from '../user-activity/user-activity.module';
import { TimezoneService } from './timezone.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Assignment, User]),
    NotificationModule,
    UserActivityModule,
    forwardRef(() => UserModule)
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService, TimezoneService, UniversalFilterService],
  exports: [AssignmentService, TimezoneService, UniversalFilterService]
})
export class SharedModule {}