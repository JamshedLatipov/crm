import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { UserActivity, ActivityType } from './user-activity.entity';
import { CreateUserActivityDto, GetUserActivitiesDto } from './user-activity.dto';

@Injectable()
export class UserActivityService {
  constructor(
    @InjectRepository(UserActivity)
    private readonly userActivityRepository: Repository<UserActivity>,
  ) {}

  async createActivity(dto: CreateUserActivityDto): Promise<UserActivity> {
    const activity = this.userActivityRepository.create(dto);
    return await this.userActivityRepository.save(activity);
  }

  async getUserActivities(
    userId: string,
    query: GetUserActivitiesDto,
  ): Promise<UserActivity[]> {
    const where: FindOptionsWhere<UserActivity> = { userId };

    if (query.type) {
      where.type = query.type;
    }

    if (query.startDate && query.endDate) {
      where.createdAt = Between(new Date(query.startDate), new Date(query.endDate));
    }

    return await this.userActivityRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit,
      skip: query.offset,
    });
  }

  async getRecentActivities(userId: string, limit: number = 10): Promise<UserActivity[]> {
    return await this.userActivityRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async logActivity(
    userId: string,
    type: ActivityType,
    metadata?: Record<string, any>,
    description?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserActivity> {
    return await this.createActivity({
      userId,
      type,
      metadata,
      description,
      ipAddress,
      userAgent,
    });
  }

  // Вспомогательные методы для часто используемых активностей
  async logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.LOGIN,
      {},
      'Пользователь вошел в систему',
      ipAddress,
      userAgent,
    );
  }

  async logLogout(userId: string): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.LOGOUT,
      {},
      'Пользователь вышел из системы',
    );
  }

  async logLeadAssigned(userId: string, leadId: string, leadTitle: string): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.LEAD_ASSIGNED,
      { leadId },
      `Лид "${leadTitle}" назначен пользователю`,
    );
  }

  async logDealAssigned(userId: string, dealId: string, dealTitle: string): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.DEAL_ASSIGNED,
      { dealId },
      `Сделка "${dealTitle}" назначена пользователю`,
    );
  }

  async logTaskAssigned(userId: string, taskId: string, taskTitle: string): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.TASK_ASSIGNED,
      { taskId },
      `Задача "${taskTitle}" назначена пользователю`,
    );
  }

  async logLeadUnassigned(userId: string, leadId: string, leadTitle: string): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.LEAD_UNASSIGNED,
      { leadId },
      `Лид "${leadTitle}" снят с пользователя`,
    );
  }

  async logDealUnassigned(userId: string, dealId: string, dealTitle: string): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.DEAL_UNASSIGNED,
      { dealId },
      `Сделка "${dealTitle}" снята с пользователя`,
    );
  }

  async logTaskUnassigned(userId: string, taskId: string, taskTitle: string): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.TASK_UNASSIGNED,
      { taskId },
      `Задача "${taskTitle}" снята с пользователя`,
    );
  }

  async logLeadViewed(userId: string, leadId: string, leadTitle: string): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.LEAD_VIEWED,
      { leadId },
      `Лид "${leadTitle}" просмотрен`,
    );
  }

  async logCallStarted(userId: string, callId: string, contactPhone: string): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.CALL_STARTED,
      { callId, contactPhone },
      `Звонок на номер ${contactPhone}`,
    );
  }

  async logCallEnded(userId: string, callId: string, duration: number): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.CALL_ENDED,
      { callId, duration },
      `Звонок завершен (длительность: ${duration} сек)`,
    );
  }

  async logPasswordChanged(userId: string): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.PASSWORD_CHANGED,
      {},
      'Пароль изменен',
    );
  }

  async logProfileUpdated(userId: string, changes: Record<string, any>): Promise<UserActivity> {
    return await this.logActivity(
      userId,
      ActivityType.PROFILE_UPDATED,
      changes,
      'Профиль обновлен',
    );
  }
}