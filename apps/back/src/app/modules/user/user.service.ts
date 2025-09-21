import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './user.entity';

interface AutoAssignCriteria {
  criteria: string[];
  industry?: string;
  territory?: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async getManagers(availableOnly = false): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where("user.roles LIKE '%sales_manager%' OR user.roles LIKE '%senior_manager%' OR user.roles LIKE '%team_lead%' OR user.roles LIKE '%account_manager%'")
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
    return await this.userRepository.find({ 
      where: { id: In(ids) } 
    });
  }

  async getOptimalManagerForAssignment(criteria: AutoAssignCriteria): Promise<User | null> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .where("user.roles LIKE '%sales_manager%' OR user.roles LIKE '%senior_manager%' OR user.roles LIKE '%team_lead%' OR user.roles LIKE '%account_manager%'")
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere('user.isAvailableForAssignment = :isAvailable', { isAvailable: true })
      .andWhere('user.currentLeadsCount < user.maxLeadsCapacity');

    // Фильтрация по территории
    if (criteria.territory) {
      query.andWhere("user.territories LIKE :territory", { 
        territory: `%${criteria.territory}%` 
      });
    }

    // Фильтрация по навыкам/отрасли
    if (criteria.industry) {
      query.andWhere("user.skills LIKE :industry", { 
        industry: `%${criteria.industry}%` 
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
      // Приоритет опытным менеджерам
      query.addOrderBy('user.totalLeadsHandled', 'DESC');
    }

    const users = await query.limit(1).getMany();
    return users.length > 0 ? users[0] : null;
  }

  async updateLeadCount(userId: number, increment: number): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ 
        currentLeadsCount: () => `currentLeadsCount + ${increment}`,
        lastActiveAt: new Date()
      })
      .where('id = :id', { id: userId })
      .execute();
  }

  async getManagersStatistics(): Promise<{
    totalManagers: number;
    availableManagers: number;
    overloadedManagers: number;
    averageWorkload: number;
    topPerformers: Array<{
      id: number;
      name: string;
      conversionRate: number;
      totalLeads: number;
    }>;
  }> {
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
    // Создаем тестовых менеджеров если их нет
    const existingCount = await this.userRepository.count({
      where: [
        { roles: In(['sales_manager']) },
        { roles: In(['senior_manager']) },
        { roles: In(['team_lead']) },
        { roles: In(['account_manager']) }
      ]
    });

    if (existingCount === 0) {
      const testManagers = [
        {
          username: 'a.petrov',
          password: 'password123',
          roles: ['sales_manager'],
          firstName: 'Алексей',
          lastName: 'Петров',
          email: 'a.petrov@company.com',
          department: 'Продажи',
          currentLeadsCount: 3,
          maxLeadsCapacity: 15,
          conversionRate: 25.5,
          skills: ['IT', 'Enterprise'],
          territories: ['Москва', 'МО'],
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
          currentLeadsCount: 7,
          maxLeadsCapacity: 20,
          conversionRate: 32.1,
          skills: ['Healthcare', 'Finance'],
          territories: ['СПб', 'ЛО'],
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
          currentLeadsCount: 12,
          maxLeadsCapacity: 15,
          conversionRate: 28.7,
          skills: ['Manufacturing', 'Logistics'],
          territories: ['Екатеринбург', 'УрФО'],
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
          currentLeadsCount: 5,
          maxLeadsCapacity: 12,
          conversionRate: 35.2,
          skills: ['Retail', 'E-commerce'],
          territories: ['Казань', 'ПФО'],
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
          currentLeadsCount: 18,
          maxLeadsCapacity: 15,
          conversionRate: 42.8,
          skills: ['Enterprise', 'Government'],
          territories: ['Москва', 'Регионы'],
          isAvailableForAssignment: false // Перегружен
        }
      ];

      await this.userRepository.save(testManagers);
    }
  }
}
