import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../shared/entities/notification.entity';
import { NotificationRule } from '../shared/entities/notification-rule.entity';
import { NotificationService } from '../shared/services/notification.service';
import { NotificationRuleService } from '../shared/services/notification-rule.service';
import { NotificationController } from './controllers/notification.controller';
import { NotificationRuleController } from './controllers/notification-rule.controller';
import { NotificationGateway } from './gateways/notification.gateway';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationRule
    ])
  ],
  controllers: [
    NotificationController,
    NotificationRuleController
  ],
  providers: [
    NotificationService,
    NotificationRuleService,
    NotificationGateway,
    JwtService
  ],
  exports: [
    NotificationService,
    NotificationRuleService
  ]
})
export class NotificationModule {}