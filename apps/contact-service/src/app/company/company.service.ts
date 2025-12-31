import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
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
}
