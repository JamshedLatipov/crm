import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Brackets } from 'typeorm';
import { 
  ContactSegment, 
  SegmentFilter, 
  FilterGroup,
  FilterCondition,
  isFilterGroup,
  SegmentUsageType 
} from '../entities/contact-segment.entity';
import { 
  CreateContactSegmentDto, 
  UpdateContactSegmentDto, 
  SegmentQueryDto 
} from '../dto/contact-segment.dto';
import { Contact } from '../../contacts/contact.entity';
import { User } from '../../user/user.entity';

@Injectable()
export class ContactSegmentService {
  constructor(
    @InjectRepository(ContactSegment)
    private segmentRepository: Repository<ContactSegment>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  /**
   * Создание нового сегмента
   */
  async create(
    createDto: CreateContactSegmentDto, 
    userId: number
  ): Promise<ContactSegment> {
    const segment = await this.segmentRepository.insert({
      ...createDto,
      createdBy: userId,
      filters: createDto.filters as any,
    });

    const savedId = segment.identifiers[0].id;

    // Подсчитываем количество контактов в сегменте
    await this.recalculateSegment(savedId);

    return this.findOne(savedId);
  }

  /**
   * Получение всех сегментов с фильтрацией и пагинацией
   */
  async findAll(
    queryDto: SegmentQueryDto
  ): Promise<{
    data: ContactSegment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = queryDto.page || 1;
    const limit = Math.min(queryDto.limit || 20, 100); // Max 100
    const skip = (page - 1) * limit;

    const query = this.segmentRepository
      .createQueryBuilder('segment')
      .leftJoinAndSelect('segment.creator', 'creator')
      .orderBy('segment.createdAt', 'DESC');

    // Фильтрация по типу использования
    if (queryDto.usageType) {
      query.andWhere('segment.usageType = :usageType', { 
        usageType: queryDto.usageType 
      });
    }

    // Фильтрация по активности
    if (queryDto.isActive !== undefined) {
      query.andWhere('segment.isActive = :isActive', { 
        isActive: queryDto.isActive 
      });
    }

    // Фильтрация по динамичности
    if (queryDto.isDynamic !== undefined) {
      query.andWhere('segment.isDynamic = :isDynamic', { 
        isDynamic: queryDto.isDynamic 
      });
    }

    // Поиск по имени и описанию
    if (queryDto.search) {
      query.andWhere(
        '(segment.name ILIKE :search OR segment.description ILIKE :search)',
        { search: `%${queryDto.search}%` }
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
  async findOne(id: string): Promise<ContactSegment> {
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
    updateDto: UpdateContactSegmentDto
  ): Promise<ContactSegment> {
    const segment = await this.findOne(id);

    await this.segmentRepository.update(id, {
      ...updateDto,
      filters: updateDto.filters ? (updateDto.filters as any) : segment.filters,
    });

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
  async duplicate(id: string, userId: number): Promise<ContactSegment> {
    const segment = await this.findOne(id);

    const duplicateData = await this.segmentRepository.insert({
      name: `${segment.name} (копия)`,
      description: segment.description,
      usageType: segment.usageType,
      filters: segment.filters as any,
      filterLogic: segment.filterLogic,
      isDynamic: segment.isDynamic,
      isActive: segment.isActive,
      metadata: segment.metadata,
      createdBy: userId,
    });

    const savedId = duplicateData.identifiers[0].id;

    // Подсчитываем количество контактов в новом сегменте
    await this.recalculateSegment(savedId);

    return this.findOne(savedId);
  }

  /**
   * Получение контактов по сегменту с пагинацией
   */
  async getSegmentContacts(
    segmentId: string, 
    options?: { page?: number; limit?: number }
  ): Promise<{
    data: Contact[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const segment = await this.findOne(segmentId);

    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);
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
   * Используется для SMS и звонков
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
      name: contact.name || 'Неизвестно',
    }));
  }

  /**
   * Получение email адресов из сегмента
   * Используется для email-рассылок
   */
  async getSegmentEmails(segmentId: string): Promise<Array<{
    contactId: string;
    email: string;
    name: string;
  }>> {
    const segment = await this.findOne(segmentId);

    const query = this.buildContactQuery(segment.filters, segment.filterLogic)
      .select(['contact.id', 'contact.email', 'contact.name'])
      .andWhere('contact.email IS NOT NULL')
      .andWhere("contact.email != ''");

    const contacts = await query.getMany();

    return contacts.map((contact) => ({
      contactId: contact.id,
      email: contact.email,
      name: contact.name || 'Неизвестно',
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
      metadata: {
        ...segment.metadata,
        lastCalculated: new Date().toISOString(),
        estimatedSize: count,
      } as any,
    });

    return count;
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
    filters: SegmentFilter[] | FilterGroup,
    filterLogic: 'AND' | 'OR' = 'AND',
    limit: number = 10
  ): Promise<{ contacts: Contact[]; total: number }> {
    const query = this.buildContactQuery(filters, filterLogic).take(limit);

    const [contacts, total] = await query.getManyAndCount();

    return { contacts, total };
  }

  /**
   * Получение всех контактов с телефонами
   */
  async getAllPhoneNumbers(): Promise<Array<{
    contactId: string;
    phoneNumber: string;
    name: string;
  }>> {
    const contacts = await this.contactRepository
      .createQueryBuilder('contact')
      .select(['contact.id', 'contact.phone', 'contact.name'])
      .where('contact.phone IS NOT NULL')
      .andWhere("contact.phone != ''")
      .getMany();

    return contacts.map((contact) => ({
      contactId: contact.id,
      phoneNumber: contact.phone,
      name: contact.name || 'Неизвестно',
    }));
  }

  /**
   * Построение запроса для выборки контактов по фильтрам
   * Поддерживает как старый формат (массив), так и новый (FilterGroup)
   */
  private buildContactQuery(
    filters: SegmentFilter[] | FilterGroup,
    filterLogic?: 'AND' | 'OR'
  ): SelectQueryBuilder<Contact> {
    const query = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.company', 'company');

    // Проверяем, какой формат фильтров
    if (Array.isArray(filters)) {
      // Старый формат: массив фильтров
      if (filters.length === 0) {
        return query;
      }
      this.applyLegacyFilters(query, filters, filterLogic || 'AND');
    } else if (filters && typeof filters === 'object' && 'conditions' in filters) {
      // Новый формат: FilterGroup с индивидуальными операторами для каждого условия
      this.applyFilterGroup(query, filters as FilterGroup);
    }

    return query;
  }

  /**
   * Применение FilterGroup (новый формат с поддержкой индивидуальных операторов)
   */
  private applyFilterGroup(
    query: SelectQueryBuilder<Contact>,
    group: FilterGroup,
    paramPrefix: string = ''
  ): void {
    if (!group.conditions || group.conditions.length === 0) {
      return;
    }

    query.andWhere(
      new Brackets((qb) => {
        group.conditions.forEach((filterCondition, index) => {
          const currentPrefix = `${paramPrefix}g${index}`;
          const item = filterCondition.item;
          const logicOp = index === 0 ? 'AND' : filterCondition.logicOperator;

          // Проверяем, является ли item группой
          const isGroup = item && typeof item === 'object' && 
                         'conditions' in item && Array.isArray((item as FilterGroup).conditions);

          if (isGroup) {
            // Рекурсивно обрабатываем вложенную группу
            if (logicOp === 'OR') {
              qb.orWhere(new Brackets((subQb) => {
                this.applyFilterGroup(subQb as any, item as FilterGroup, currentPrefix);
              }));
            } else {
              qb.andWhere(new Brackets((subQb) => {
                this.applyFilterGroup(subQb as any, item as FilterGroup, currentPrefix);
              }));
            }
          } else {
            // Обрабатываем отдельный фильтр
            const { condition: whereCondition, parameters } = this.buildFilterCondition(
              item as SegmentFilter,
              currentPrefix
            );

            if (whereCondition) {
              if (logicOp === 'OR') {
                qb.orWhere(whereCondition, parameters);
              } else {
                qb.andWhere(whereCondition, parameters);
              }
            }
          }
        });
      })
    );
  }

  /**
   * Применение старого формата фильтров (массив)
   */
  private applyLegacyFilters(
    query: SelectQueryBuilder<Contact>,
    filters: SegmentFilter[],
    filterLogic: 'AND' | 'OR'
  ): void {
    const conditions: string[] = [];
    const parameters: Record<string, any> = {};

    filters.forEach((filter, index) => {
      const { condition, parameters: filterParams } = this.buildFilterCondition(
        filter,
        `param${index}`
      );

      if (condition) {
        conditions.push(condition);
        Object.assign(parameters, filterParams);
      }
    });

    if (conditions.length > 0) {
      const whereClause = conditions.join(
        filterLogic === 'AND' ? ' AND ' : ' OR '
      );
      query.where(whereClause, parameters);
    }
  }

  /**
   * Построение условия для одного фильтра
   */
  private buildFilterCondition(
    filter: SegmentFilter,
    paramKey: string
  ): { condition: string; parameters: Record<string, any> } {
    const fieldPath = this.getFieldPath(filter.field);
    let condition = '';
    const parameters: Record<string, any> = {};

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
        if (Array.isArray(filter.value) && filter.value.length === 2) {
          condition = `${fieldPath} BETWEEN :${paramKey}_start AND :${paramKey}_end`;
          parameters[`${paramKey}_start`] = filter.value[0];
          parameters[`${paramKey}_end`] = filter.value[1];
        }
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

    return { condition, parameters };
  }

  /**
   * Маппинг поля на путь в запросе
   */
  private getFieldPath(field: string): string {
    // Поля компании
    if (field === 'company' || field === 'companyName') {
      return 'company.name';
    }
    
    // Все остальные поля контакта
    return `contact.${field}`;
  }
}
