import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { WebsocketModule } from '../websocket/websocket.module';
import { NotificationRule } from './entities/notification-rule.entity';
import { NotificationRuleController } from './rules/notification-rule.controller';
import { NotificationRuleService } from './rules/notification-rule.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationRule]),
    forwardRef(() => WebsocketModule),
  ],
  controllers: [NotificationController, NotificationRuleController],
  providers: [NotificationService, NotificationRuleService],
  exports: [NotificationService, NotificationRuleService],
})
export class NotificationModule {}
