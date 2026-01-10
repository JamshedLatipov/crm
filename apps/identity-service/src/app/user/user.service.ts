import { Injectable, NotFoundException, Inject, Optional, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import {
  UserDto,
  CreateUserDto,
  UpdateUserDto,
  UpdateWorkloadDto,
  AutoAssignCriteriaDto,
  ManagersAggregateStatsDto,
  createPaginatedResponse,
  PaginationQueryDto,
} from '@crm/contracts';
import {
  SERVICES,
  USER_EVENTS,
  createEvent,
} from '@crm/contracts';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Optional() @Inject(SERVICES.NOTIFICATION)
    private readonly notificationClient?: ClientProxy,
  ) {}

  /**
   * Convert entity to DTO (strips sensitive data)
   */
  private toDto(user: User): UserDto {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
      department: user.department,
      avatar: user.avatar,
      isActive: user.isActive,
      timezone: user.timezone,
      currentLeadsCount: user.currentLeadsCount,
      maxLeadsCapacity: user.maxLeadsCapacity,
      currentDealsCount: user.currentDealsCount,
      maxDealsCapacity: user.maxDealsCapacity,
      currentTasksCount: user.currentTasksCount,
      maxTasksCapacity: user.maxTasksCapacity,
      conversionRate: Number(user.conversionRate),
      totalRevenue: Number(user.totalRevenue),
      totalLeadsHandled: user.totalLeadsHandled,
      isAvailableForAssignment: user.isAvailableForAssignment,
      managerID: user.managerID,
      sipEndpointId: user.sipEndpointId || undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastActiveAt: user.lastActiveAt?.toISOString(),
    };
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, sortBy = 'id', sortDir = 'desc', q } = query;
    const skip = (page - 1) * limit;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL');

    if (q) {
      qb.andWhere(
        '(user.username ILIKE :q OR user.firstName ILIKE :q OR user.lastName ILIKE :q OR user.email ILIKE :q)',
        { q: `%${q}%` }
      );
    }

    qb.orderBy(`user.${sortBy}`, sortDir.toUpperCase() as 'ASC' | 'DESC')
      .skip(skip)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();
    return createPaginatedResponse(users.map(u => this.toDto(u)), total, page, limit);
  }

  async findById(id: number): Promise<UserDto | null> {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    return user ? this.toDto(user) : null;
  }

  async findByIdWithPassword(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async findByIds(ids: number[]): Promise<UserDto[]> {
    if (ids.length === 0) return [];
    const users = await this.userRepository.find({
      where: { id: In(ids), deletedAt: IsNull() },
    });
    return users.map(u => this.toDto(u));
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async create(dto: CreateUserDto): Promise<UserDto> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });
    const saved = await this.userRepository.save(user);

    // Emit event
    this.emitEvent(USER_EVENTS.CREATED, {
      userId: saved.id,
      username: saved.username,
      email: saved.email,
      roles: saved.roles,
    });

    return this.toDto(saved);
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserDto> {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    Object.assign(user, dto);
    const saved = await this.userRepository.save(user);

    // Emit event
    this.emitEvent(USER_EVENTS.UPDATED, {
      userId: saved.id,
      changes: dto,
    });

    return this.toDto(saved);
  }

  async delete(id: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.deletedAt = new Date();
    user.isActive = false;
    await this.userRepository.save(user);

    // Emit event
    this.emitEvent(USER_EVENTS.DELETED, {
      userId: user.id,
      username: user.username,
    });
  }

  async getManagers(availableOnly = false): Promise<UserDto[]> {
    const managerRoles = ['sales_manager', 'senior_manager', 'team_lead', 'account_manager'];

    const roleConditions = managerRoles
      .map((_, index) => `user.roles LIKE :role${index}`)
      .join(' OR ');

    const roleParams = managerRoles.reduce((acc, role, index) => {
      acc[`role${index}`] = `%${role}%`;
      return acc;
    }, {} as Record<string, string>);

    const query = this.userRepository
      .createQueryBuilder('user')
      .where(`(${roleConditions})`, roleParams)
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere('user.deletedAt IS NULL');

    if (availableOnly) {
      query
        .andWhere('user.isAvailableForAssignment = :isAvailable', { isAvailable: true })
        .andWhere('user.currentLeadsCount < user.maxLeadsCapacity');
    }

    const users = await query
      .orderBy('user.currentLeadsCount', 'ASC')
      .addOrderBy('user.conversionRate', 'DESC')
      .getMany();

    return users.map(u => this.toDto(u));
  }

  async getOptimalManagerForAssignment(criteria: AutoAssignCriteriaDto): Promise<UserDto | null> {
    const managerRoles = ['sales_manager', 'senior_manager', 'team_lead', 'account_manager'];

    const roleConditions = managerRoles
      .map((_, index) => `user.roles LIKE :role${index}`)
      .join(' OR ');

    const roleParams = managerRoles.reduce((acc, role, index) => {
      acc[`role${index}`] = `%${role}%`;
      return acc;
    }, {} as Record<string, string>);

    const query = this.userRepository
      .createQueryBuilder('user')
      .where(`(${roleConditions})`, roleParams)
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere('user.isAvailableForAssignment = :isAvailable', { isAvailable: true })
      .andWhere('user.currentLeadsCount < user.maxLeadsCapacity');

    if (criteria.territory) {
      query.andWhere('user.territories::jsonb ? :territory', {
        territory: criteria.territory,
      });
    }

    if (criteria.skill) {
      query.andWhere('user.skills::jsonb ? :skill', {
        skill: criteria.skill,
      });
    }

    const user = await query
      .orderBy('user.currentLeadsCount', 'ASC')
      .addOrderBy('user.conversionRate', 'DESC')
      .getOne();

    return user ? this.toDto(user) : null;
  }

  async updateWorkload(dto: UpdateWorkloadDto): Promise<UserDto> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId, deletedAt: IsNull() },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    const fieldMap = {
      lead: 'currentLeadsCount',
      deal: 'currentDealsCount',
      task: 'currentTasksCount',
    } as const;

    const field = fieldMap[dto.entityType];
    const previousCount = user[field];
    user[field] = Math.max(0, user[field] + dto.delta);
    const saved = await this.userRepository.save(user);

    // Emit event
    this.emitEvent(USER_EVENTS.WORKLOAD_CHANGED, {
      userId: user.id,
      entityType: dto.entityType,
      previousCount,
      newCount: saved[field],
      maxCapacity:
        dto.entityType === 'lead'
          ? user.maxLeadsCapacity
          : dto.entityType === 'deal'
          ? user.maxDealsCapacity
          : user.maxTasksCapacity,
    });

    return this.toDto(saved);
  }

  async bulkDelete(userIds: number[]): Promise<{ message: string }> {
    const users = await this.userRepository.findBy({ id: In(userIds) });
    if (users.length === 0) {
      throw new NotFoundException('No users found for bulk delete');
    }
    
    const now = new Date();
    for (const user of users) {
      user.deletedAt = now;
      user.isActive = false;
    }
    await this.userRepository.save(users);
    
    return { message: `${users.length} users deleted successfully` };
  }

  async resetPassword(id: number): Promise<{ temporaryPassword: string }> {
    const user = await this.userRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    user.password = await bcrypt.hash(tempPassword, 10);
    await this.userRepository.save(user);

    return { temporaryPassword: tempPassword };
  }

  async exportUsers(format: 'csv' | 'excel'): Promise<any> {
    const users = await this.userRepository.find({ where: { deletedAt: IsNull() } });
    const data = users.map(u => this.toDto(u));

    if (format === 'csv') {
      const headers = Object.keys(data[0] || {}).join(',');
      const rows = data.map(row => Object.values(row).join(','));
      return { format: 'csv', content: [headers, ...rows].join('\n') };
    }

    // For excel, return JSON that can be converted on the client
    return { format: 'excel', data };
  }

  async getManagersStatistics(): Promise<ManagersAggregateStatsDto> {
    const managers = await this.userRepository.find({
      where: { deletedAt: IsNull() },
    });
    
    const managerList = managers.filter(u => 
      u.roles?.includes('manager') || u.roles?.includes('admin')
    );

    const totalManagers = managerList.length;
    const availableManagers = managerList.filter(m => m.isAvailableForAssignment).length;
    const totalCapacity = managerList.reduce((sum, m) => sum + (m.maxLeadsCapacity || 0), 0);
    const currentWorkload = managerList.reduce((sum, m) => sum + (m.currentLeadsCount || 0), 0);

    return {
      totalManagers,
      availableManagers,
      totalCapacity,
      currentWorkload,
      utilizationRate: totalCapacity > 0 ? (currentWorkload / totalCapacity) * 100 : 0,
    };
  }

  async updateLeadCount(id: number, increment: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id, deletedAt: IsNull() } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.currentLeadsCount = Math.max(0, (user.currentLeadsCount || 0) + increment);
    await this.userRepository.save(user);

    return { message: 'Lead count updated successfully' };
  }

  async seedTestManagers(): Promise<{ message: string }> {
    const testManagers = [
      { username: 'manager1', firstName: 'Test', lastName: 'Manager1', email: 'manager1@test.com', roles: ['manager'] },
      { username: 'manager2', firstName: 'Test', lastName: 'Manager2', email: 'manager2@test.com', roles: ['manager'] },
      { username: 'manager3', firstName: 'Test', lastName: 'Manager3', email: 'manager3@test.com', roles: ['manager'] },
    ];

    for (const mgr of testManagers) {
      const exists = await this.userRepository.findOne({ where: { username: mgr.username } });
      if (!exists) {
        const user = this.userRepository.create({
          ...mgr,
          password: await bcrypt.hash('test123', 10),
          isActive: true,
          isAvailableForAssignment: true,
          maxLeadsCapacity: 50,
          maxDealsCapacity: 20,
          maxTasksCapacity: 30,
        });
        await this.userRepository.save(user);
      }
    }

    return { message: 'Test managers seeded successfully' };
  }

  async getTimezones(): Promise<{ timezones: { value: string; label: string; offset: string }[] }> {
    const timezones = [
      { value: 'Europe/Moscow', label: 'Москва (MSK)', offset: '+03:00' },
      { value: 'Europe/Kaliningrad', label: 'Калининград', offset: '+02:00' },
      { value: 'Europe/Samara', label: 'Самара', offset: '+04:00' },
      { value: 'Asia/Yekaterinburg', label: 'Екатеринбург', offset: '+05:00' },
      { value: 'Asia/Omsk', label: 'Омск', offset: '+06:00' },
      { value: 'Asia/Krasnoyarsk', label: 'Красноярск', offset: '+07:00' },
      { value: 'Asia/Irkutsk', label: 'Иркутск', offset: '+08:00' },
      { value: 'Asia/Yakutsk', label: 'Якутск', offset: '+09:00' },
      { value: 'Asia/Vladivostok', label: 'Владивосток', offset: '+10:00' },
      { value: 'Asia/Magadan', label: 'Магадан', offset: '+11:00' },
      { value: 'Asia/Kamchatka', label: 'Камчатка', offset: '+12:00' },
      { value: 'UTC', label: 'UTC', offset: '+00:00' },
      { value: 'Europe/London', label: 'London (GMT)', offset: '+00:00' },
      { value: 'Europe/Paris', label: 'Paris (CET)', offset: '+01:00' },
      { value: 'America/New_York', label: 'New York (EST)', offset: '-05:00' },
      { value: 'America/Los_Angeles', label: 'Los Angeles (PST)', offset: '-08:00' },
      { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00' },
      { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00' },
      { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00' },
    ];
    return { timezones };
  }

  private emitEvent(eventType: string, payload: Record<string, unknown>) {
    if (!this.notificationClient) {
      this.logger.debug(`Event ${eventType} not emitted (no notification client)`);
      return;
    }
    try {
      const event = createEvent(eventType, SERVICES.IDENTITY, payload);
      this.notificationClient.emit(eventType, event);
      this.logger.debug(`Emitted event: ${eventType}`);
    } catch (error) {
      this.logger.error(`Failed to emit event ${eventType}:`, error);
    }
  }
}
