import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// using simple interval-based polling to avoid adding @nestjs/schedule dependency
import { TaskReminder } from './reminder.entity';
import { NotificationService } from '../shared/services/notification.service';
import { NotificationChannel, NotificationType } from '../shared/entities/notification.entity';

@Injectable()
export class ReminderProcessor {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(
    @InjectRepository(TaskReminder)
    private readonly reminderRepo: Repository<TaskReminder>,
    private readonly notificationService: NotificationService
  ) {}

  // start a simple poller
  onModuleInit() {
    if (!this.intervalHandle) {
      this.intervalHandle = setInterval(() => this.handleReminders(), 60 * 1000);
    }
  }

  private intervalHandle: NodeJS.Timeout | null = null;

  async handleReminders() {
    try {
      const now = new Date();
      const due = await this.reminderRepo
        .createQueryBuilder('r')
        .leftJoinAndSelect('r.task', 'task')
        .leftJoinAndSelect('task.assignedTo', 'assignedTo')
        .where('r.active = true')
        .andWhere('r.remindAt <= :now', { now })
        .getMany();

      if (!due.length) return;

      for (const r of due) {
        try {
          const task = r.task;
          const assigned = (task as any)?.assignedTo;
          // create an in-app notification for assigned user if present
          if (assigned && assigned.id) {
            await this.notificationService.createSystemNotification(
              NotificationType.TASK_ASSIGNED as any,
              `Напоминание: ${task.title}`,
              `У вас запланированное действие: ${task.title}`,
              String(assigned.id),
              { taskId: task.id }
            );

            // also create an EMAIL-channel notification so a mailer process can send it
            if (assigned.email) {
              await this.notificationService.create({
                type: NotificationType.SYSTEM_REMINDER as any,
                title: `Напоминание: ${task.title}`,
                message: `У вас запланированное действие: ${task.title}`,
                channel: NotificationChannel.EMAIL as any,
                recipientId: String(assigned.id),
                recipientEmail: assigned.email,
                data: { taskId: task.id }
              });
            }
          }

          // update reminder: if repeatMode not set -> deactivate, otherwise compute next remindAt (simple daily/weeky handling)
          if (!r.repeatMode || r.repeatMode === 'none') {
            r.active = false;
          } else if (r.repeatMode === 'daily') {
            const next = new Date(r.remindAt);
            next.setDate(next.getDate() + 1);
            r.remindAt = next;
          } else if (r.repeatMode === 'weekly') {
            const next = new Date(r.remindAt);
            next.setDate(next.getDate() + 7);
            r.remindAt = next;
          } else {
            // for custom or unhandled modes, deactivate to avoid infinite loops
            r.active = false;
          }

          await this.reminderRepo.save(r);
        } catch (err) {
          this.logger.error('Failed processing reminder', err?.message || err);
        }
      }
    } catch (err) {
      this.logger.error('Reminder processor failed', err?.message || err);
    }
  }
}

// start polling when the provider is instantiated
// use onModuleInit pattern if needed; constructor will set interval
// but we keep method public so it can be invoked by tests

