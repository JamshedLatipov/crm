import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './user.entity';
import { AutoAssignCriteriaDto, ManagerStatsResponseDto, CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async getManagers(availableOnly = false): Promise<User[]> {
    const managerRoles = ['sales_manager', 'senior_manager', 'team_lead', 'account_manager'];
    
    // Создаем условие для проверки каждой роли отдельно
    const roleConditions = managerRoles
      .map((role, index) => `user.roles LIKE :role${index}`)
      .join(' OR ');
    
    const roleParams = managerRoles.reduce((acc, role, index) => {
      acc[`role${index}`] = `%${role}%`;
      return acc;
    }, {} as Record<string, string>);

    const query = this.userRepository
      .createQueryBuilder('user')
      .where(`(${roleConditions})`, roleParams)
      .andWhere('user.isActive = :isActive', { isActive: true });

    if (availableOnly) {
      query.andWhere('user.isAvailableForAssignment = :isAvailable', { isAvailable: true })
           .andWhere('user.currentLeadsCount < user.maxLeadsCapacity');
    }

    return await query
      .orderBy('user.currentLeadsCount', 'ASC')
      .addOrderBy('user.conversionRate', 'DESC')
      .getMany();
  }

  async findById(id: number): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findByIds(ids: number[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return await this.userRepository.find({ 
      where: { id: In(ids) } 
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }

  async getOptimalManagerForAssignment(criteria: AutoAssignCriteriaDto): Promise<User | null> {
    const managerRoles = ['sales_manager', 'senior_manager', 'team_lead', 'account_manager'];
    
    // Создаем условие для проверки каждой роли отдельно
    const roleConditions = managerRoles
      .map((role, index) => `user.roles LIKE :role${index}`)
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

    // Фильтрация по территории
    if (criteria.territory) {
      query.andWhere('user.territories::jsonb ? :territory', { 
        territory: criteria.territory
      });
    }

    // Фильтрация по навыкам/отрасли
    if (criteria.industry) {
      query.andWhere('user.skills::jsonb ? :industry', { 
        industry: criteria.industry
      });
    }

    // Сортировка по критериям
    if (criteria.criteria.includes('workload')) {
      query.addOrderBy('user.currentLeadsCount', 'ASC');
    }
    
    if (criteria.criteria.includes('performance')) {
      query.addOrderBy('user.conversionRate', 'DESC');
    }

    if (criteria.criteria.includes('expertise')) {
      query.addOrderBy('user.totalLeadsHandled', 'DESC');
    }

    const users = await query.limit(1).getMany();
    return users.length > 0 ? users[0] : null;
  }

  async updateLeadCount(userId: number, increment: number): Promise<void> {
    const result = await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ 
        currentLeadsCount: () => `GREATEST(0, currentLeadsCount + ${increment})`,
        lastActiveAt: new Date()
      })
      .where('id = :id', { id: userId })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  async getManagersStatistics(): Promise<ManagerStatsResponseDto> {
    const managers = await this.getManagers();
    
    const totalManagers = managers.length;
    const availableManagers = managers.filter(m => 
      m.isAvailableForAssignment && m.currentLeadsCount < m.maxLeadsCapacity
    ).length;
    const overloadedManagers = managers.filter(m => m.isOverloaded).length;
    
    const totalLeads = managers.reduce((sum, m) => sum + m.currentLeadsCount, 0);
    const averageWorkload = totalManagers > 0 ? Math.round(totalLeads / totalManagers) : 0;

    const topPerformers = managers
      .filter(m => m.totalLeadsHandled > 0)
      .sort((a, b) => Number(b.conversionRate) - Number(a.conversionRate))
      .slice(0, 5)
      .map(m => ({
        id: m.id,
        name: m.fullName,
        conversionRate: Number(m.conversionRate),
        totalLeads: m.totalLeadsHandled
      }));

    return {
      totalManagers,
      availableManagers,
      overloadedManagers,
      averageWorkload,
      topPerformers
    };
  }

  async seedTestManagers(): Promise<void> {
    // Проверяем, есть ли уже менеджеры
    const managerRoles = ['sales_manager', 'senior_manager', 'team_lead', 'account_manager'];
    const roleConditions = managerRoles
      .map((role, index) => `user.roles LIKE :role${index}`)
      .join(' OR ');
    
    const roleParams = managerRoles.reduce((acc, role, index) => {
      acc[`role${index}`] = `%${role}%`;
      return acc;
    }, {} as Record<string, string>);
    
    const existingManagersCount = await this.userRepository
      .createQueryBuilder('user')
      .where(`(${roleConditions})`, roleParams)
      .getCount();

    if (existingManagersCount === 0) {
      const testManagers: CreateUserDto[] = [
        {
          username: 'a.petrov',
          password: 'password123',
          roles: ['sales_manager'],
          firstName: 'Алексей',
          lastName: 'Петров',
          email: 'a.petrov@company.com',
          department: 'Продажи',
          skills: ['IT', 'Enterprise'],
          territories: ['Москва', 'МО'],
          maxLeadsCapacity: 15,
          isAvailableForAssignment: true
        },
        {
          username: 'm.ivanova',
          password: 'password123',
          roles: ['senior_manager'],
          firstName: 'Мария',
          lastName: 'Иванова',
          email: 'm.ivanova@company.com',
          department: 'Продажи',
          skills: ['Healthcare', 'Finance'],
          territories: ['СПб', 'ЛО'],
          maxLeadsCapacity: 20,
          isAvailableForAssignment: true
        },
        {
          username: 'd.sidorov',
          password: 'password123',
          roles: ['account_manager'],
          firstName: 'Дмитрий',
          lastName: 'Сидоров',
          email: 'd.sidorov@company.com',
          department: 'Продажи',
          skills: ['Manufacturing', 'Logistics'],
          territories: ['Екатеринбург', 'УрФО'],
          maxLeadsCapacity: 15,
          isAvailableForAssignment: true
        },
        {
          username: 'e.kozlova',
          password: 'password123',
          roles: ['sales_manager'],
          firstName: 'Елена',
          lastName: 'Козлова',
          email: 'e.kozlova@company.com',
          department: 'Продажи',
          skills: ['Retail', 'E-commerce'],
          territories: ['Казань', 'ПФО'],
          maxLeadsCapacity: 12,
          isAvailableForAssignment: true
        },
        {
          username: 'i.morozov',
          password: 'password123',
          roles: ['team_lead'],
          firstName: 'Игорь',
          lastName: 'Морозов',
          email: 'i.morozov@company.com',
          department: 'Продажи',
          skills: ['Enterprise', 'Government'],
          territories: ['Москва', 'Регионы'],
          maxLeadsCapacity: 15,
          isAvailableForAssignment: false
        }
      ];

      // Создаем пользователей и устанавливаем начальные значения
      for (const managerDto of testManagers) {
        const user = this.userRepository.create({
          ...managerDto,
          currentLeadsCount: Math.floor(Math.random() * (managerDto.maxLeadsCapacity || 15)),
          conversionRate: 20 + Math.random() * 25, // 20-45%
          totalLeadsHandled: Math.floor(Math.random() * 100),
          totalRevenue: Math.floor(Math.random() * 1000000)
        });
        await this.userRepository.save(user);
      }
    }
  }

  async deleteUser(id: number): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async searchUsersForAssignment(criteria: {
    query?: string;
    role?: string;
    department?: string;
    available?: boolean;
    limit?: number;
  }): Promise<User[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true });

    if (criteria.query) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.email ILIKE :query OR user.username ILIKE :query)',
        { query: `%${criteria.query}%` }
      );
    }

    if (criteria.role) {
      queryBuilder.andWhere('user.roles LIKE :role', { role: `%${criteria.role}%` });
    }

    if (criteria.department) {
      queryBuilder.andWhere('user.department = :department', { department: criteria.department });
    }

    if (criteria.available) {
      queryBuilder
        .andWhere('user.isAvailableForAssignment = :isAvailable', { isAvailable: true })
        .andWhere('user.currentLeadsCount < user.maxLeadsCapacity');
    }

    queryBuilder
      .orderBy('user.currentLeadsCount', 'ASC')
      .addOrderBy('user.fullName', 'ASC')
      .limit(criteria.limit || 20);

    return queryBuilder.getMany();
  }

  async getUsersByRole(role: string, availableOnly = true): Promise<User[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.roles LIKE :role', { role: `%${role}%` });

    if (availableOnly) {
      queryBuilder
        .andWhere('user.isAvailableForAssignment = :isAvailable', { isAvailable: true })
        .andWhere('user.currentLeadsCount < user.maxLeadsCapacity');
    }

    return queryBuilder
      .orderBy('user.currentLeadsCount', 'ASC')
      .addOrderBy('user.fullName', 'ASC')
      .getMany();
  }

  async getUserStatistics(): Promise<any> {
    const users = await this.getAllUsers();
    const activeUsers = users.filter(u => u.isActive);
    
    // Calculate role distribution
    const roleDistribution: Record<string, number> = {};
    users.forEach(user => {
      user.roles.forEach(role => {
        roleDistribution[role] = (roleDistribution[role] || 0) + 1;
      });
    });

    // Calculate department distribution
    const departmentDistribution: Record<string, number> = {};
    users.forEach(user => {
      if (user.department) {
        departmentDistribution[user.department] = (departmentDistribution[user.department] || 0) + 1;
      }
    });

    // Get top performers
    const topPerformers = users
      .filter(u => u.isActive && u.totalLeadsHandled > 0)
      .sort((a, b) => Number(b.conversionRate) - Number(a.conversionRate))
      .slice(0, 5);

    return {
      totalUsers: users.length,
      activeUsers: activeUsers.length,
      totalDepartments: [...new Set(users.map(u => u.department).filter(Boolean))].length,
      averageConversion: activeUsers.length > 0 
        ? activeUsers.reduce((sum, u) => sum + Number(u.conversionRate), 0) / activeUsers.length 
        : 0,
      topPerformers,
      roleDistribution,
      departmentDistribution
    };
  }

  async bulkUpdateUsers(userIds: number[], updates: UpdateUserDto): Promise<User[]> {
    const users = await this.findByIds(userIds);
    if (users.length !== userIds.length) {
      throw new NotFoundException('Some users not found');
    }

    const updatedUsers: User[] = [];
    for (const user of users) {
      Object.assign(user, updates);
      const savedUser = await this.userRepository.save(user);
      updatedUsers.push(savedUser);
    }

    return updatedUsers;
  }

  async bulkDeleteUsers(userIds: number[]): Promise<void> {
    const result = await this.userRepository.delete({ id: In(userIds) });
    if (result.affected !== userIds.length) {
      throw new NotFoundException('Some users not found');
    }
  }

  async changePassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // In a real implementation, you would hash the password
    // Hash the new password before saving so login (bcrypt.compare) works
    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await this.userRepository.save(user);
  }

  async resetPassword(userId: number): Promise<string> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Generate temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8);
    // Hash the temporary password before saving so the user can log in using it
    const hash = await bcrypt.hash(temporaryPassword, 10);
    user.password = hash;
    await this.userRepository.save(user);

    // Return the plaintext temporary password to the caller (for display/copy)
    return temporaryPassword;
  }

  async exportUsers(format: 'csv' | 'excel'): Promise<any> {
    const users = await this.getAllUsers();
    
    // In a real implementation, you would use libraries like csv-writer or xlsx
    // For now, return the data structure
    const exportData = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department,
      roles: user.roles.join(', '),
      isActive: user.isActive,
      currentLeadsCount: user.currentLeadsCount,
      maxLeadsCapacity: user.maxLeadsCapacity,
      conversionRate: user.conversionRate,
      createdAt: user.createdAt
    }));

    if (format === 'csv') {
      // Return CSV structure - in real implementation, convert to actual CSV
      return {
        type: 'csv',
        data: exportData,
        headers: Object.keys(exportData[0] || {})
      };
    } else {
      // Return Excel structure - in real implementation, convert to actual Excel
      return {
        type: 'excel',
        data: exportData,
        headers: Object.keys(exportData[0] || {})
      };
    }
  }
}
