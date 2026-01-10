import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, LessThan } from 'typeorm';
import { Company } from './entities/company.entity';

export interface CreateCompanyDto {
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  employeeCount?: number;
  annualRevenue?: number;
  description?: string;
  customFields?: Record<string, unknown>;
  inn?: string;
  size?: string;
  ownerId?: string;
  tags?: string[];
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {
  isActive?: boolean;
}

export interface CompanyFilterDto {
  page?: number;
  limit?: number;
  search?: string;
  industry?: string;
  isActive?: boolean;
  size?: string;
}

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async findAll(filter: CompanyFilterDto) {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.companyRepository.createQueryBuilder('company');

    if (filter.search) {
      queryBuilder.andWhere(
        '(company.name ILIKE :search OR company.industry ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    if (filter.industry) {
      queryBuilder.andWhere('company.industry = :industry', { industry: filter.industry });
    }

    if (filter.isActive !== undefined) {
      queryBuilder.andWhere('company.isActive = :isActive', { isActive: filter.isActive });
    }

    queryBuilder.orderBy('company.name', 'ASC');
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['contacts'],
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  async create(dto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepository.create(dto);
    return this.companyRepository.save(company);
  }

  async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.companyRepository.findOne({ where: { id } });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    Object.assign(company, dto);
    return this.companyRepository.save(company);
  }

  async remove(id: string): Promise<void> {
    const company = await this.companyRepository.findOne({ where: { id } });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    await this.companyRepository.remove(company);
  }

  async findInactive(days = 90): Promise<Company[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.companyRepository.find({
      where: {
        lastActivityAt: LessThan(cutoffDate),
        isActive: true,
      },
      order: { lastActivityAt: 'ASC' },
    });
  }

  async search(query: string): Promise<Company[]> {
    return this.companyRepository.find({
      where: [
        { name: ILike(`%${query}%`) },
        { description: ILike(`%${query}%`) },
        { address: ILike(`%${query}%`) },
      ],
      take: 50,
    });
  }

  async getStats() {
    const total = await this.companyRepository.count();
    const active = await this.companyRepository.count({ where: { isActive: true } });
    const blacklisted = await this.companyRepository.count({ where: { isBlacklisted: true } });

    const byIndustry = await this.companyRepository
      .createQueryBuilder('company')
      .select('company.industry', 'industry')
      .addSelect('COUNT(*)', 'count')
      .groupBy('company.industry')
      .getRawMany();

    return { total, active, blacklisted, byIndustry };
  }

  async findDuplicates() {
    const duplicates = await this.companyRepository
      .createQueryBuilder('company')
      .select('company.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .groupBy('company.name')
      .having('COUNT(*) > 1')
      .getRawMany();

    return duplicates;
  }

  async findByInn(inn: string): Promise<Company[]> {
    return this.companyRepository.find({ where: { inn } });
  }

  async findByIndustry(industry: string): Promise<Company[]> {
    return this.companyRepository.find({ where: { industry } });
  }

  async findBySize(size: string): Promise<Company[]> {
    return this.companyRepository.find({ where: { size } });
  }

  async addToBlacklist(id: string, reason: string): Promise<Company> {
    const company = await this.findOne(id);
    company.isBlacklisted = true;
    company.blacklistReason = reason;
    return this.companyRepository.save(company);
  }

  async removeFromBlacklist(id: string): Promise<Company> {
    const company = await this.findOne(id);
    company.isBlacklisted = false;
    company.blacklistReason = undefined;
    return this.companyRepository.save(company);
  }

  async assignOwner(id: string, ownerId: string): Promise<Company> {
    const company = await this.findOne(id);
    company.ownerId = ownerId;
    return this.companyRepository.save(company);
  }

  async touchActivity(id: string): Promise<Company> {
    const company = await this.findOne(id);
    company.lastActivityAt = new Date();
    return this.companyRepository.save(company);
  }

  async updateRating(id: string, rating: number): Promise<Company> {
    const company = await this.findOne(id);
    company.rating = rating;
    return this.companyRepository.save(company);
  }

  async addTags(id: string, tags: string[]): Promise<Company> {
    const company = await this.findOne(id);
    const currentTags = company.tags || [];
    company.tags = [...new Set([...currentTags, ...tags])];
    return this.companyRepository.save(company);
  }

  async removeTags(id: string, tags: string[]): Promise<Company> {
    const company = await this.findOne(id);
    company.tags = (company.tags || []).filter(t => !tags.includes(t));
    return this.companyRepository.save(company);
  }
}
