import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Company, CompanyType, CompanySize, Industry } from '../entities/company.entity';
import { CreateCompanyDto } from '../dto/create-company.dto';
import { UpdateCompanyDto } from '../dto/update-company.dto';
import { CustomFieldsService } from '../../custom-fields/services/custom-fields.service';
import { UniversalFilterService } from '../../shared/services/universal-filter.service';
import { SearchCompaniesAdvancedDto } from '../dto/search-companies-advanced.dto';

export interface CompanyFilters {
  search?: string;
  type?: CompanyType;
  industry?: Industry;
  size?: CompanySize;
  city?: string;
  region?: string;
  country?: string;
  isActive?: boolean;
  isBlacklisted?: boolean;
  ownerId?: string;
  tags?: string[];
  minRevenue?: number;
  maxRevenue?: number;
  minEmployees?: number;
  maxEmployees?: number;
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    private readonly customFieldsService: CustomFieldsService,
    private readonly universalFilterService: UniversalFilterService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Validate custom fields if provided
    if (createCompanyDto.customFields) {
      const validation = await this.customFieldsService.validateCustomFields(
        'company',
        createCompanyDto.customFields
      );
      if (!validation.isValid) {
        const errorMessages = Object.entries(validation.errors)
          .map(([field, errs]) => `${field}: ${errs.join(', ')}`)
          .join('; ');
        throw new BadRequestException(`Custom fields validation failed: ${errorMessages}`);
      }
    }

    // Prevent creating companies with duplicate INN
    if (createCompanyDto.inn) {
      const existing = await this.companiesRepository.findOne({ where: { inn: createCompanyDto.inn } });
      if (existing) {
        return existing; // idempotent create by INN
      }
    }

    // Normalize tags: trim, unique
    const tags = (createCompanyDto.tags || []).map(t => t.trim()).filter(Boolean);
    const uniqueTags = Array.from(new Set(tags));

  // Local DTO input shape where date-like fields may be string | Date
  type CreateCompanyDtoInput = Omit<CreateCompanyDto, 'foundedDate'> & { foundedDate?: string | Date };
  const { foundedDate: dtoFoundedDate, ...restCreate } = createCompanyDto as CreateCompanyDtoInput;
  const founded = dtoFoundedDate ? new Date(dtoFoundedDate as string) : undefined;

    const companyPayload: Partial<Company> = {
      ...(restCreate as Partial<Company>),
      foundedDate: founded,
      tags: uniqueTags,
      firstContactDate: new Date(),
      lastActivityDate: new Date(),
    };

    const company = this.companiesRepository.create(companyPayload);
    return await this.companiesRepository.save(company);
  }

  async findAll(filters: CompanyFilters = {}): Promise<Company[]> {
    const queryBuilder = this.companiesRepository.createQueryBuilder('company');

    // Поиск по названию, описанию, адресу
    if (filters.search) {
      queryBuilder.andWhere(
        '(company.name ILIKE :search OR company.legalName ILIKE :search OR company.description ILIKE :search OR company.address ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Фильтры по типу, индустрии, размеру
    if (filters.type) {
      queryBuilder.andWhere('company.type = :type', { type: filters.type });
    }

    if (filters.industry) {
      queryBuilder.andWhere('company.industry = :industry', { industry: filters.industry });
    }

    if (filters.size) {
      queryBuilder.andWhere('company.size = :size', { size: filters.size });
    }

    // Географические фильтры
    if (filters.city) {
      queryBuilder.andWhere('company.city ILIKE :city', { city: `%${filters.city}%` });
    }

    if (filters.region) {
      queryBuilder.andWhere('company.region ILIKE :region', { region: `%${filters.region}%` });
    }

    if (filters.country) {
      queryBuilder.andWhere('company.country ILIKE :country', { country: `%${filters.country}%` });
    }

    // Статус компании
    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('company.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters.isBlacklisted !== undefined) {
      queryBuilder.andWhere('company.isBlacklisted = :isBlacklisted', { isBlacklisted: filters.isBlacklisted });
    }

    // Ответственный менеджер
    if (filters.ownerId) {
      queryBuilder.andWhere('company.ownerId = :ownerId', { ownerId: filters.ownerId });
    }

    // Фильтр по доходам
    if (filters.minRevenue !== undefined) {
      queryBuilder.andWhere('company.annualRevenue >= :minRevenue', { minRevenue: filters.minRevenue });
    }

    if (filters.maxRevenue !== undefined) {
      queryBuilder.andWhere('company.annualRevenue <= :maxRevenue', { maxRevenue: filters.maxRevenue });
    }

    // Фильтр по количеству сотрудников
    if (filters.minEmployees !== undefined) {
      queryBuilder.andWhere('company.employeeCount >= :minEmployees', { minEmployees: filters.minEmployees });
    }

    if (filters.maxEmployees !== undefined) {
      queryBuilder.andWhere('company.employeeCount <= :maxEmployees', { maxEmployees: filters.maxEmployees });
    }

    // Фильтр по тегам
    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('company.tags && :tags', { tags: filters.tags });
    }

    return await queryBuilder
      .orderBy('company.lastActivityDate', 'DESC')
      .addOrderBy('company.name', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<Company> {
    return await this.companiesRepository.findOne({
      where: { id },
      // relations: ['contacts', 'deals'], // Добавим позже
    });
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    // Validate custom fields if provided
    if (updateCompanyDto.customFields) {
      const validation = await this.customFieldsService.validateCustomFields(
        'company',
        updateCompanyDto.customFields
      );
      if (!validation.isValid) {
        const errorMessages = Object.entries(validation.errors)
          .map(([field, errs]) => `${field}: ${errs.join(', ')}`)
          .join('; ');
        throw new BadRequestException(`Custom fields validation failed: ${errorMessages}`);
      }
    }

    const tags = updateCompanyDto.tags ? (updateCompanyDto.tags || []).map(t => t.trim()).filter(Boolean) : undefined;
    const uniqueTags = tags ? Array.from(new Set(tags)) : undefined;

    // Convert any incoming date-like strings into Date and avoid spreading string-typed dates
  type UpdateCompanyDtoInput = Omit<UpdateCompanyDto, 'foundedDate' | 'lastContactDate' | 'lastActivityDate'> & { foundedDate?: string | Date; lastContactDate?: string | Date; lastActivityDate?: string | Date };
  const { foundedDate: updFoundedDate, lastContactDate: updLastContactDate, ...restUpdate } = updateCompanyDto as UpdateCompanyDtoInput;
  const lastContact = updLastContactDate ? new Date(updLastContactDate as string) : undefined;
  const foundedUpd = updFoundedDate ? new Date(updFoundedDate as string) : undefined;
    const lastActivity = new Date();

    const updatePayload: Partial<Company> = {
      ...(restUpdate as Partial<Company>),
      foundedDate: foundedUpd,
      tags: uniqueTags,
      lastContactDate: lastContact,
      lastActivityDate: lastActivity,
    };

    await this.companiesRepository.update(id, updatePayload);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.companiesRepository.delete(id);
  }

  // Специальные методы для работы с компаниями

  async findByInn(inn: string): Promise<Company[]> {
    return await this.companiesRepository.find({
      where: { inn: Like(`%${inn}%`) }
    });
  }

  async findInactive(daysSinceLastActivity = 90): Promise<Company[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastActivity);
    
    return await this.companiesRepository
      .createQueryBuilder('company')
      .where('company.lastActivityDate < :cutoffDate OR company.lastActivityDate IS NULL', { cutoffDate })
      .andWhere('company.isActive = true')
      .orderBy('company.lastActivityDate', 'ASC')
      .getMany();
  }

  async findByIndustry(industry: Industry): Promise<Company[]> {
    return await this.companiesRepository.find({
      where: { industry },
      order: { annualRevenue: 'DESC' }
    });
  }

  async findBySize(size: CompanySize): Promise<Company[]> {
    return await this.companiesRepository.find({
      where: { size },
      order: { employeeCount: 'DESC' }
    });
  }

  async addToBlacklist(id: string, reason: string): Promise<Company> {
    return await this.update(id, {
      isBlacklisted: true,
      blacklistReason: reason,
      isActive: false,
    });
  }

  async removeFromBlacklist(id: string): Promise<Company> {
    return await this.update(id, {
      isBlacklisted: false,
      blacklistReason: null,
      isActive: true,
    });
  }

  async assignOwner(id: string, ownerId: string): Promise<Company> {
    return await this.update(id, { ownerId });
  }

  async touchActivity(id: string): Promise<Company> {
    return await this.update(id, { 
      lastActivityDate: new Date(),
      lastContactDate: new Date()
    });
  }

  async updateRating(id: string, rating: number): Promise<Company> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    return await this.update(id, { rating });
  }

  async addTags(id: string, newTags: string[]): Promise<Company> {
    const company = await this.findOne(id);
    const existingTags = company.tags || [];
    const uniqueTags = [...new Set([...existingTags, ...newTags])];
    
    return await this.update(id, { tags: uniqueTags });
  }

  async removeTags(id: string, tagsToRemove: string[]): Promise<Company> {
    const company = await this.findOne(id);
    const filteredTags = (company.tags || []).filter(tag => !tagsToRemove.includes(tag));
    
    return await this.update(id, { tags: filteredTags });
  }

  // Статистические методы

  async getCompanyStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    blacklisted: number;
    byType: Record<CompanyType, number>;
    byIndustry: Record<Industry, number>;
    bySize: Record<CompanySize, number>;
  }> {
    const total = await this.companiesRepository.count();
    const active = await this.companiesRepository.count({ where: { isActive: true } });
    const inactive = await this.companiesRepository.count({ where: { isActive: false } });
    const blacklisted = await this.companiesRepository.count({ where: { isBlacklisted: true } });

    // Статистика по типам
    const byType = {} as Record<CompanyType, number>;
    for (const type of Object.values(CompanyType)) {
      byType[type] = await this.companiesRepository.count({ where: { type } });
    }

    // Статистика по индустриям
    const byIndustry = {} as Record<Industry, number>;
    for (const industry of Object.values(Industry)) {
      byIndustry[industry] = await this.companiesRepository.count({ where: { industry } });
    }

    // Статистика по размерам
    const bySize = {} as Record<CompanySize, number>;
    for (const size of Object.values(CompanySize)) {
      bySize[size] = await this.companiesRepository.count({ where: { size } });
    }

    return {
      total,
      active,
      inactive,
      blacklisted,
      byType,
      byIndustry,
      bySize,
    };
  }

  async findDuplicates(): Promise<{ name: string; companies: Company[] }[]> {
    const duplicates = await this.companiesRepository
      .createQueryBuilder('company')
      .select('company.name')
      .addSelect('array_agg(company.id)', 'ids')
      .addSelect('COUNT(*)', 'count')
      .groupBy('company.name')
      .having('COUNT(*) > 1')
      .getRawMany();

    const result = [];
    for (const dup of duplicates) {
      const companies = await this.companiesRepository.find({
        where: { id: In(dup.ids.split(',')) }
      });
      result.push({
        name: dup.company_name,
        companies
      });
    }

    return result;
  }

  /**
   * Advanced search with universal filters
   */
  async searchCompaniesWithFilters(
    dto: SearchCompaniesAdvancedDto,
    page = 1,
    pageSize = 25,
  ): Promise<{ data: Company[]; total: number }> {
    // Static field mappings for companies
    const staticFields: Record<string, string> = {
      name: 'company.name',
      legalName: 'company.legalName',
      inn: 'company.inn',
      kpp: 'company.kpp',
      description: 'company.description',
      website: 'company.website',
      email: 'company.email',
      phone: 'company.phone',
      address: 'company.address',
      city: 'company.city',
      region: 'company.region',
      country: 'company.country',
      postalCode: 'company.postalCode',
      type: 'company.type',
      industry: 'company.industry',
      size: 'company.size',
      employeeCount: 'company.employeeCount',
      revenue: 'company.revenue',
      foundedDate: 'company.foundedDate',
      firstContactDate: 'company.firstContactDate',
      lastActivityDate: 'company.lastActivityDate',
      isActive: 'company.isActive',
      isBlacklisted: 'company.isBlacklisted',
      blacklistReason: 'company.blacklistReason',
      notes: 'company.notes',
      createdAt: 'company.createdAt',
      updatedAt: 'company.updatedAt',
    };

    const queryBuilder = this.companiesRepository.createQueryBuilder('company');

    // Apply text search across multiple fields
    if (dto.search) {
      queryBuilder.andWhere(
        '(company.name ILIKE :search OR company.legalName ILIKE :search OR company.description ILIKE :search OR company.address ILIKE :search OR company.email ILIKE :search OR company.phone ILIKE :search)',
        { search: `%${dto.search}%` }
      );
    }

    // Apply status tab filtering
    if (dto.status && dto.status !== 'all') {
      if (dto.status === 'active') {
        queryBuilder.andWhere('company.isActive = :isActive', { isActive: true });
      } else if (dto.status === 'inactive') {
        queryBuilder.andWhere('company.isActive = :isActive', { isActive: false });
      } else if (dto.status === 'blacklisted') {
        queryBuilder.andWhere('company.isBlacklisted = :isBlacklisted', { isBlacklisted: true });
      }
    }

    // Apply universal filters
    if (dto.filters && dto.filters.length > 0) {
      this.universalFilterService.applyFilters(
        queryBuilder,
        dto.filters,
        'company',
        staticFields,
      );
    }

    // Count total results
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip((page - 1) * pageSize).take(pageSize);

    // Default ordering
    queryBuilder.orderBy('company.name', 'ASC');

    const data = await queryBuilder.getMany();

    return { data, total };
  }
}
