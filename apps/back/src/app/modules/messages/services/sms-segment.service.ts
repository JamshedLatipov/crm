import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { SmsSegment, SegmentFilter } from '../entities/sms-segment.entity';
import { CreateSegmentDto, UpdateSegmentDto } from '../dto/segment.dto';
import { Contact } from '../../contacts/contact.entity';
import { Lead } from '../../leads/lead.entity';
import { User } from '../../user/user.entity';

@Injectable()
export class SmsSegmentService {
  constructor(
    @InjectRepository(SmsSegment)
    private segmentRepository: Repository<SmsSegment>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>
  ) {}

  /**
   * Создание нового сегмента
   */
  async create(createDto: CreateSegmentDto, user: User): Promise<SmsSegment> {
    const segment = this.segmentRepository.create({
      ...createDto,
      createdBy: user,
    });

    const savedSegment = await this.segmentRepository.save(segment);

    // Подсчитываем количество контактов в сегменте
    await this.recalculateSegment(savedSegment.id);

    return this.findOne(savedSegment.id);
  }

  /**
   * Получение всех сегментов с пагинацией
   */
  async findAll(filters?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    isDynamic?: boolean;
    search?: string;
  }): Promise<{
    data: SmsSegment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.segmentRepository.createQueryBuilder('segment')
      .leftJoinAndSelect('segment.createdBy', 'createdBy')
      .orderBy('segment.createdAt', 'DESC');

    if (filters?.isActive !== undefined) {
      query.andWhere('segment.isActive = :isActive', { isActive: filters.isActive });
    }

    if (filters?.isDynamic !== undefined) {
      query.andWhere('segment.isDynamic = :isDynamic', { isDynamic: filters.isDynamic });
    }

    if (filters?.search) {
      query.andWhere(
        '(segment.name ILIKE :search OR segment.description ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const [data, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получение сегмента по ID
   */
  async findOne(id: string): Promise<SmsSegment> {
    const segment = await this.segmentRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!segment) {
      throw new NotFoundException(`Segment with ID ${id} not found`);
    }

    return segment;
  }

  /**
   * Обновление сегмента
   */
  async update(id: string, updateDto: UpdateSegmentDto): Promise<SmsSegment> {
    const segment = await this.findOne(id);

    Object.assign(segment, updateDto);

    await this.segmentRepository.save(segment);

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
   * Дублирование сегмента
   */
  async duplicate(id: string, user: User): Promise<SmsSegment> {
    const segment = await this.findOne(id);

    const duplicate = this.segmentRepository.create({
      name: `${segment.name} (копия)`,
      description: segment.description,
      filters: segment.filters,
      filterLogic: segment.filterLogic,
      isDynamic: segment.isDynamic,
      isActive: segment.isActive,
      createdBy: user,
    });

    const savedSegment = await this.segmentRepository.save(duplicate);

    // Подсчитываем количество контактов в новом сегменте
    await this.recalculateSegment(savedSegment.id);

    return this.findOne(savedSegment.id);
  }

  /**
   * Получение контактов по сегменту с пагинацией
   */
  async getSegmentContacts(segmentId: string, options?: {
    page?: number;
    limit?: number;
  }): Promise<{
    data: Contact[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const segment = await this.findOne(segmentId);

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.buildContactQuery(segment.filters, segment.filterLogic);

    query.skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получение номеров телефонов из сегмента
   */
  async getSegmentPhoneNumbers(segmentId: string): Promise<Array<{
    contactId: string;
    phoneNumber: string;
    name: string;
  }>> {
    const segment = await this.findOne(segmentId);

    const query = this.buildContactQuery(segment.filters, segment.filterLogic)
      .select(['contact.id', 'contact.phone', 'contact.name'])
      .andWhere('contact.phone IS NOT NULL')
      .andWhere("contact.phone != ''");

    const contacts = await query.getMany();

    return contacts.map((contact) => ({
      contactId: contact.id,
      phoneNumber: contact.phone,
      name: contact.name,
    }));
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
    filters: SegmentFilter[],
    filterLogic: 'AND' | 'OR' = 'AND'
  ): SelectQueryBuilder<Contact> {
    const query = this.contactRepository.createQueryBuilder('contact')
      .leftJoinAndSelect('contact.company', 'company')
      .leftJoinAndSelect('contact.deals', 'deals');

    if (filters.length === 0) {
      return query;
    }

    const conditions: string[] = [];
    const parameters: Record<string, any> = {};

    filters.forEach((filter, index) => {
      const paramKey = `param${index}`;
      let condition = '';

      switch (filter.operator) {
        case 'equals':
          condition = `contact.${filter.field} = :${paramKey}`;
          parameters[paramKey] = filter.value;
          break;

        case 'notEquals':
        case 'not_equals':
          condition = `contact.${filter.field} != :${paramKey}`;
          parameters[paramKey] = filter.value;
          break;

        case 'contains':
          condition = `contact.${filter.field} ILIKE :${paramKey}`;
          parameters[paramKey] = `%${filter.value}%`;
          break;

        case 'notContains':
        case 'not_contains':
          condition = `contact.${filter.field} NOT ILIKE :${paramKey}`;
          parameters[paramKey] = `%${filter.value}%`;
          break;

        case 'startsWith':
        case 'starts_with':
          condition = `contact.${filter.field} ILIKE :${paramKey}`;
          parameters[paramKey] = `${filter.value}%`;
          break;

        case 'endsWith':
        case 'ends_with':
          condition = `contact.${filter.field} ILIKE :${paramKey}`;
          parameters[paramKey] = `%${filter.value}`;
          break;

        case 'greater':
          condition = `contact.${filter.field} > :${paramKey}`;
          parameters[paramKey] = filter.value;
          break;

        case 'less':
          condition = `contact.${filter.field} < :${paramKey}`;
          parameters[paramKey] = filter.value;
          break;

        case 'between':
          condition = `contact.${filter.field} BETWEEN :${paramKey}_start AND :${paramKey}_end`;
          parameters[`${paramKey}_start`] = filter.value[0];
          parameters[`${paramKey}_end`] = filter.value[1];
          break;

        case 'in':
          condition = `contact.${filter.field} IN (:...${paramKey})`;
          parameters[paramKey] = Array.isArray(filter.value) ? filter.value : [filter.value];
          break;

        case 'notIn':
        case 'not_in':
          condition = `contact.${filter.field} NOT IN (:...${paramKey})`;
          parameters[paramKey] = Array.isArray(filter.value) ? filter.value : [filter.value];
          break;
      }

      if (condition) {
        conditions.push(condition);
      }
    });

    if (conditions.length > 0) {
      const whereClause = conditions.join(filterLogic === 'AND' ? ' AND ' : ' OR ');
      query.where(whereClause, parameters);
    }

    return query;
  }

  /**
   * Пересчёт всех динамических сегментов
   */
  async recalculateAllDynamic(): Promise<void> {
    const dynamicSegments = await this.segmentRepository.find({
      where: { isDynamic: true, isActive: true },
    });

    for (const segment of dynamicSegments) {
      await this.recalculateSegment(segment.id);
    }
  }

  /**
   * Предпросмотр сегмента (без сохранения)
   */
  async previewSegment(
    filters: SegmentFilter[],
    filterLogic: 'AND' | 'OR' = 'AND',
    limit: number = 10
  ): Promise<{ contacts: Contact[]; total: number }> {
    const query = this.buildContactQuery(filters, filterLogic).take(limit);

    const [contacts, total] = await query.getManyAndCount();

    return { contacts, total };
  }
}
