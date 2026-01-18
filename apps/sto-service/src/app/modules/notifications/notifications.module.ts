import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  StoNotificationRule,
  StoMessageTemplate,
} from '@libs/shared/sto-types';
import { NotificationService } from './services/notification.service';
import { TemplateRendererService } from './services/template-renderer.service';
import { NotificationRuleController } from './controllers/notification-rule.controller';
import { MessageTemplateController } from './controllers/message-template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StoNotificationRule, StoMessageTemplate])],
  controllers: [NotificationRuleController, MessageTemplateController],
  providers: [NotificationService, TemplateRendererService],
  exports: [NotificationService],
})
export class NotificationsModule {}
