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
  ManagerStatsDto,
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
