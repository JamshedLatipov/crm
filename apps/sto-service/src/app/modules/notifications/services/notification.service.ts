import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  StoNotificationRule,
  StoNotificationTrigger,
  StoOrder,
} from '@libs/shared/sto-types';
import { TemplateRendererService } from './template-renderer.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(StoNotificationRule)
    private notificationRuleRepository: Repository<StoNotificationRule>,
    private templateRendererService: TemplateRendererService,
  ) {}

  async processStatusChange(
    order: StoOrder,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    // Map status to trigger
    const triggerMap: Record<string, StoNotificationTrigger> = {
      in_progress: StoNotificationTrigger.ORDER_STARTED,
      completed: StoNotificationTrigger.ORDER_COMPLETED,
      blocked: StoNotificationTrigger.ORDER_BLOCKED,
    };

    const trigger = triggerMap[newStatus];
    if (!trigger) {
      return;
    }

    // Find active rules for this trigger
    const rules = await this.notificationRuleRepository.find({
      where: { triggerStatus: trigger, isActive: true },
      relations: ['template'],
    });

    for (const rule of rules) {
      await this.sendNotificationForRule(order, rule);
    }
  }

  private async sendNotificationForRule(
    order: StoOrder,
    rule: StoNotificationRule,
  ): Promise<void> {
    if (!rule.template) {
      console.warn(`Rule ${rule.id} has no template assigned`);
      return;
    }

    // Render template with order data
    const message = this.templateRendererService.render(rule.template.body, order);

    // Send notification for each channel
    for (const channel of rule.channels) {
      const sendFn = async () => {
        await this.sendNotification({
          channel,
          recipient: order.customerPhone,
          message,
          subject: rule.template.subject,
          orderId: order.id,
        });
      };

      if (rule.delayMinutes > 0) {
        setTimeout(sendFn, rule.delayMinutes * 60000);
      } else {
        await sendFn();
      }
    }
  }

  private async sendNotification(payload: {
    channel: string;
    recipient: string;
    message: string;
    subject?: string;
    orderId: string;
  }): Promise<void> {
    // TODO: Send to RabbitMQ queue 'sto_notification_request'
    // Will be consumed by CRM MessagesModule
    console.log('Sending notification:', payload);
  }

  async sendTestNotification(
    ruleId: string,
    testRecipient: { phone?: string; email?: string },
  ): Promise<void> {
    const rule = await this.notificationRuleRepository.findOne({
      where: { id: ruleId },
      relations: ['template'],
    });

    if (!rule || !rule.template) {
      throw new Error('Rule or template not found');
    }

    // Create mock order data for testing
    const mockOrder = {
      customerName: 'Тестовый Клиент',
      customerPhone: testRecipient.phone || '+992000000000',
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry',
      vehicleYear: 2020,
      licensePlate: 'A123BC',
      workDescription: 'Замена масла и фильтра',
      estimatedTime: '30 минут',
      estimatedCost: '500',
      mechanicName: 'Иван Иванов',
      bayNumber: '5',
      queueNumber: '101',
    } as any;

    const message = this.templateRendererService.render(rule.template.body, mockOrder);

    for (const channel of rule.channels) {
      const recipient = channel === 'email' ? testRecipient.email : testRecipient.phone;
      if (!recipient) continue;

      await this.sendNotification({
        channel,
        recipient,
        message: `[ТЕСТ] ${message}`,
        subject: rule.template.subject ? `[ТЕСТ] ${rule.template.subject}` : undefined,
        orderId: 'test',
      });
    }
  }
}
