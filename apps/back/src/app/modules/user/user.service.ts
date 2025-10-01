import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './user.entity';
import { AutoAssignCriteriaDto, ManagerStatsResponseDto, CreateUserDto, UpdateUserDto } from './dto/user.dto';

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
}
