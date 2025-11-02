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