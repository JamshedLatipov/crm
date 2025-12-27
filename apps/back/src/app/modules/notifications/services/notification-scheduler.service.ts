import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull, Not } from 'typeorm';
import { Lead, LeadStatus } from '../../leads/lead.entity';
import { Deal, DealStatus } from '../../deals/deal.entity';
import { Task } from '../../tasks/task.entity';
import { NotificationService } from '../../shared/services/notification.service';
import { NotificationType, NotificationChannel, NotificationPriority } from '../../shared/entities/notification.entity';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Deal)
    private readonly dealRepo: Repository<Deal>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Проверка просроченных лидов
   * Запускается каждый день в 9:00
   */
  @Cron('0 9 * * *', {
    name: 'check-overdue-leads',
    timeZone: 'Europe/Moscow',
  })
  async checkOverdueLeads() {
    this.logger.log('Checking for overdue leads...');
    
    try {
      // Лиды, которые не обновлялись более 7 дней и находятся в активном статусе
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const overdueLeads = await this.leadRepo.find({
        where: {
          updatedAt: LessThan(sevenDaysAgo),
          status: Not(LeadStatus.CONVERTED),
        },
      });

      this.logger.log(`Found ${overdueLeads.length} overdue leads`);

      for (const lead of overdueLeads) {
        try {
          // Получаем assignedTo из lead (может быть добавлено через attachAssignments)
          const assignedTo = (lead as any).assignedTo || 'admin';
          
          await this.notificationService.createLeadNotification(
            NotificationType.LEAD_OVERDUE,
            'Просроченный лид',
            `Лид "${lead.name}" не обновлялся более 7 дней. Требуется внимание!`,
            { leadId: lead.id, leadName: lead.name, lastUpdated: lead.updatedAt },
            String(assignedTo),
            [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            NotificationPriority.HIGH
          );
        } catch (err) {
          this.logger.warn(`Failed to send notification for lead ${lead.id}:`, err?.message || err);
        }
      }
    } catch (error) {
      this.logger.error('Error checking overdue leads:', error);
    }
  }

  /**
   * Проверка просроченных сделок
   * Запускается каждый день в 9:00
   */
  @Cron('0 9 * * *', {
    name: 'check-overdue-deals',
    timeZone: 'Europe/Moscow',
  })
  async checkOverdueDeals() {
    this.logger.log('Checking for overdue deals...');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Сделки с истекшей ожидаемой датой закрытия
      const overdueDeals = await this.dealRepo.find({
        where: {
          expectedCloseDate: LessThan(today),
          status: DealStatus.OPEN,
        },
      });

      this.logger.log(`Found ${overdueDeals.length} overdue deals`);

      for (const deal of overdueDeals) {
        try {
          const assignedTo = (deal as any).assignedTo || 'admin';
          
          await this.notificationService.createDealNotification(
            NotificationType.DEAL_OVERDUE,
            'Просроченная сделка',
            `Сделка "${deal.title}" просрочена! Ожидаемая дата закрытия: ${deal.expectedCloseDate.toLocaleDateString('ru-RU')}`,
            { dealId: deal.id, dealTitle: deal.title, expectedCloseDate: deal.expectedCloseDate },
            String(assignedTo),
            [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            NotificationPriority.URGENT
          );
        } catch (err) {
          this.logger.warn(`Failed to send notification for deal ${deal.id}:`, err?.message || err);
        }
      }
    } catch (error) {
      this.logger.error('Error checking overdue deals:', error);
    }
  }

  /**
   * Проверка приближающейся даты закрытия сделок
   * Запускается каждый день в 9:00
   */
  @Cron('0 9 * * *', {
    name: 'check-approaching-deals',
    timeZone: 'Europe/Moscow',
  })
  async checkApproachingDeals() {
    this.logger.log('Checking for deals with approaching close date...');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Сделки, которые должны закрыться в ближайшие 3 дня
      const approachingDeals = await this.dealRepo.find({
        where: {
          expectedCloseDate: MoreThan(today),
          status: DealStatus.OPEN,
        },
      });

      // Фильтруем только те, что в пределах 3 дней
      const filteredDeals = approachingDeals.filter(
        deal => deal.expectedCloseDate <= threeDaysFromNow
      );

      this.logger.log(`Found ${filteredDeals.length} deals with approaching close date`);

      for (const deal of filteredDeals) {
        try {
          const assignedTo = (deal as any).assignedTo || 'admin';
          const daysLeft = Math.ceil(
            (deal.expectedCloseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          await this.notificationService.createDealNotification(
            NotificationType.DEAL_CLOSE_DATE_APPROACHING,
            'Приближается дата закрытия',
            `До закрытия сделки "${deal.title}" осталось ${daysLeft} дн.! Дата: ${deal.expectedCloseDate.toLocaleDateString('ru-RU')}`,
            { dealId: deal.id, dealTitle: deal.title, expectedCloseDate: deal.expectedCloseDate, daysLeft },
            String(assignedTo),
            [NotificationChannel.IN_APP],
            NotificationPriority.HIGH
          );
        } catch (err) {
          this.logger.warn(`Failed to send notification for deal ${deal.id}:`, err?.message || err);
        }
      }
    } catch (error) {
      this.logger.error('Error checking approaching deals:', error);
    }
  }

  /**
   * Проверка застопорившихся сделок
   * Запускается каждый день в 10:00
   */
  @Cron('0 10 * * *', {
    name: 'check-stale-deals',
    timeZone: 'Europe/Moscow',
  })
  async checkStaleDeals() {
    this.logger.log('Checking for stale deals...');
    
    try {
      // Сделки, которые не обновлялись более 14 дней
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const staleDeals = await this.dealRepo.find({
        where: {
          updatedAt: LessThan(fourteenDaysAgo),
          status: DealStatus.OPEN,
        },
      });

      this.logger.log(`Found ${staleDeals.length} stale deals`);

      for (const deal of staleDeals) {
        try {
          const assignedTo = (deal as any).assignedTo || 'admin';
          const daysSinceUpdate = Math.floor(
            (new Date().getTime() - deal.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          await this.notificationService.createDealNotification(
            NotificationType.DEAL_STALE,
            'Застопорившаяся сделка',
            `Сделка "${deal.title}" не обновлялась ${daysSinceUpdate} дней. Требуется активность!`,
            { dealId: deal.id, dealTitle: deal.title, daysSinceUpdate },
            String(assignedTo),
            [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            NotificationPriority.MEDIUM
          );
        } catch (err) {
          this.logger.warn(`Failed to send notification for deal ${deal.id}:`, err?.message || err);
        }
      }
    } catch (error) {
      this.logger.error('Error checking stale deals:', error);
    }
  }

  /**
   * Проверка просроченных задач
   * Запускается каждый день в 9:00 и в 17:00
   */
  @Cron('0 9,17 * * *', {
    name: 'check-overdue-tasks',
    timeZone: 'Europe/Moscow',
  })
  async checkOverdueTasks() {
    this.logger.log('Checking for overdue tasks...');
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Задачи с истекшим сроком выполнения
      const overdueTasks = await this.taskRepo.find({
        where: {
          dueDate: LessThan(today),
          status: Not('completed'),
        },
      });

      this.logger.log(`Found ${overdueTasks.length} overdue tasks`);

      for (const task of overdueTasks) {
        try {
          // Получаем assignedTo из task
          const assignedTo = (task as any).assignedToId || 'admin';
          const daysOverdue = Math.floor(
            (today.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          await this.notificationService.createTaskNotification(
            NotificationType.TASK_OVERDUE,
            'Просроченная задача',
            `Задача "${task.title}" просрочена на ${daysOverdue} дн.! Срок: ${task.dueDate.toLocaleDateString('ru-RU')}`,
            { taskId: task.id, taskTitle: task.title, dueDate: task.dueDate, daysOverdue },
            String(assignedTo),
            [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            NotificationPriority.URGENT
          );
        } catch (err) {
          this.logger.warn(`Failed to send notification for task ${task.id}:`, err?.message || err);
        }
      }
    } catch (error) {
      this.logger.error('Error checking overdue tasks:', error);
    }
  }
}
