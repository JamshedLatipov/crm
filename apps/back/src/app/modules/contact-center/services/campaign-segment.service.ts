import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Brackets } from 'typeorm';
import { CampaignSegment, CampaignSegmentFilter } from '../entities/campaign-segment.entity';
import {
  CreateCampaignSegmentDto,
  UpdateCampaignSegmentDto,
  CampaignSegmentFiltersDto,
} from '../dto/campaign/campaign-segment.dto';
import { Contact } from '../../contacts/contact.entity';

@Injectable()
export class CampaignSegmentService {
  constructor(
    @InjectRepository(CampaignSegment)
    private readonly segmentRepository: Repository<CampaignSegment>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  /**
   * Создание нового сегмента
   */
  async create(
    createDto: CreateCampaignSegmentDto,
    userId: number,
  ): Promise<CampaignSegment> {
    const result = await this.segmentRepository.insert({
      name: createDto.name,
      description: createDto.description,
      filters: createDto.filters as any,
      filterLogic: createDto.filterLogic || 'AND',
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      isDynamic: createDto.isDynamic || false,
      createdBy: userId,
    });

    const segmentId = result.identifiers[0].id;

    // Подсчитываем количество контактов в сегменте
    await this.recalculateSegment(segmentId);

    return this.findOne(segmentId);
  }

  /**
   * Получение всех сегментов
   */
  async findAll(filters?: CampaignSegmentFiltersDto): Promise<CampaignSegment[]> {
    const query = this.segmentRepository
      .createQueryBuilder('segment')
      .leftJoinAndSelect('segment.creator', 'creator')
      .orderBy('segment.createdAt', 'DESC');

    if (filters?.isActive !== undefined) {
      query.andWhere('segment.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.isDynamic !== undefined) {
      query.andWhere('segment.isDynamic = :isDynamic', {
        isDynamic: filters.isDynamic,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(segment.name ILIKE :search OR segment.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return query.getMany();
  }

  /**
   * Получение сегмента по ID
   */
  async findOne(id: string): Promise<CampaignSegment> {
    const segment = await this.segmentRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!segment) {
      throw new NotFoundException(`Segment with ID ${id} not found`);
    }

    return segment;
  }

  /**
   * Обновление сегмента
   */
  async update(
    id: string,
    updateDto: UpdateCampaignSegmentDto,
  ): Promise<CampaignSegment> {
    const segment = await this.findOne(id);

    await this.segmentRepository.update(id, updateDto as any);

    // Пересчитываем сегмент при изменении фильтров
    if (updateDto.filters) {
      await this.recalculateSegment(id);
    }

    return this.findOne(id);
  }

  /**
   * Удаление сегмента
   */
  async remove(id: string): Promise<void> {
    const segment = await this.findOne(id);
    await this.segmentRepository.remove(segment);
  }

  /**
   * Получение контактов по сегменту
   */
  async getSegmentContacts(segmentId: string): Promise<Contact[]> {
    const segment = await this.findOne(segmentId);

    const query = this.buildContactQuery(segment.filters, segment.filterLogic);
    return query.getMany();
  }

  /**
   * Получение телефонов из сегмента для кампании
   */
  async getSegmentPhoneNumbers(segmentId: string): Promise<
    Array<{
      phone: string;
      firstName?: string;
      lastName?: string;
    }>
  > {
    const segment = await this.findOne(segmentId);

    const query = this.buildContactQuery(segment.filters, segment.filterLogic)
      .select(['contact.id', 'contact.phone', 'contact.name', 'contact.email'])
      .andWhere('contact.phone IS NOT NULL')
      .andWhere("contact.phone != ''");

    const contacts = await query.getMany();

    return contacts.map((contact) => {
      const [firstName, ...lastNameParts] = (contact.name || '').split(' ');
      return {
        phone: contact.phone,
        firstName: firstName || undefined,
        lastName: lastNameParts.join(' ') || undefined,
      };
    });
  }

  /**
   * Пересчёт количества контактов в сегменте
   */
  async recalculateSegment(segmentId: string): Promise<number> {
    const segment = await this.findOne(segmentId);

    const query = this.buildContactQuery(segment.filters, segment.filterLogic);
    const count = await query.getCount();

    await this.segmentRepository.update(segmentId, {
      contactsCount: count,
      lastCalculatedAt: new Date(),
    });

    return count;
  }

  /**
   * Построение запроса для выборки контактов по фильтрам
   */
  private buildContactQuery(
    filters: CampaignSegmentFilter[],
    filterLogic: 'AND' | 'OR' = 'AND',
  ): SelectQueryBuilder<Contact> {
    const query = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.company', 'company');

    if (filters.length === 0) {
      return query;
    }

    const conditions: string[] = [];
    const parameters: Record<string, any> = {};

    filters.forEach((filter, index) => {
      const paramKey = `param_${index}`;
      let condition = '';

      // Определяем поле для фильтрации
      const fieldPath = this.getFieldPath(filter.field);

      switch (filter.operator) {
        case 'equals':
          condition = `${fieldPath} = :${paramKey}`;
          parameters[paramKey] = filter.value;
          break;

        case 'not_equals':
          condition = `${fieldPath} != :${paramKey}`;
          parameters[paramKey] = filter.value;
          break;

        case 'contains':
          condition = `${fieldPath} ILIKE :${paramKey}`;
          parameters[paramKey] = `%${filter.value}%`;
          break;

        case 'not_contains':
          condition = `${fieldPath} NOT ILIKE :${paramKey}`;
          parameters[paramKey] = `%${filter.value}%`;
          break;

        case 'starts_with':
          condition = `${fieldPath} ILIKE :${paramKey}`;
          parameters[paramKey] = `${filter.value}%`;
          break;

        case 'ends_with':
          condition = `${fieldPath} ILIKE :${paramKey}`;
          parameters[paramKey] = `%${filter.value}`;
          break;

        case 'greater':
          condition = `${fieldPath} > :${paramKey}`;
          parameters[paramKey] = filter.value;
          break;

        case 'less':
          condition = `${fieldPath} < :${paramKey}`;
          parameters[paramKey] = filter.value;
          break;

        case 'between':
          condition = `${fieldPath} BETWEEN :${paramKey}_min AND :${paramKey}_max`;
          parameters[`${paramKey}_min`] = filter.value[0];
          parameters[`${paramKey}_max`] = filter.value[1];
          break;

        case 'in':
          condition = `${fieldPath} IN (:...${paramKey})`;
          parameters[paramKey] = Array.isArray(filter.value)
            ? filter.value
            : [filter.value];
          break;

        case 'not_in':
          condition = `${fieldPath} NOT IN (:...${paramKey})`;
          parameters[paramKey] = Array.isArray(filter.value)
            ? filter.value
            : [filter.value];
          break;

        case 'is_null':
          condition = `${fieldPath} IS NULL`;
          break;

        case 'is_not_null':
          condition = `${fieldPath} IS NOT NULL`;
          break;
      }

      if (condition) {
        conditions.push(condition);
      }
    });

    if (conditions.length > 0) {
      const operator = filterLogic === 'OR' ? ' OR ' : ' AND ';
      query.andWhere(
        new Brackets((qb) => {
          qb.where(conditions.join(operator), parameters);
        }),
      );
    }

    return query;
  }

  /**
   * Получение пути к полю для фильтрации
   */
  private getFieldPath(field: string): string {
    const fieldMap: Record<string, string> = {
      name: 'contact.name',
      phone: 'contact.phone',
      email: 'contact.email',
      company: 'company.name',
      position: 'contact.position',
      source: 'contact.source',
      tags: 'contact.tags',
      createdAt: 'contact.createdAt',
      updatedAt: 'contact.updatedAt',
    };

    return fieldMap[field] || `contact.${field}`;
  }
}
