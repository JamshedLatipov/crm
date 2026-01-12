import { Injectable, NotFoundException, Inject, Optional, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact, ContactType, ContactSource } from './contact.entity';
import { ContactActivity, ActivityType } from './contact-activity.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CompaniesService } from '../companies/services/companies.service';
import { NotificationService } from '../shared/services/notification.service';
import { NotificationType, NotificationPriority } from '../shared/entities/notification.entity';
import { NameResolverService } from '../contact-center/services/name-resolver.service';
import { CustomFieldsService } from '../custom-fields/services/custom-fields.service';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(ContactActivity)
    private readonly activityRepository: Repository<ContactActivity>,
    private readonly customFieldsService: CustomFieldsService,
    @Optional() private readonly companiesService?: CompaniesService,
    @Optional() private readonly notificationService?: NotificationService,
    @Optional() @Inject(forwardRef(() => NameResolverService))
    private readonly nameResolverService?: NameResolverService,
  ) {}

  // Local helper to avoid spreading 'any' directly in code and satisfy lint rules
  private typeGuardAny(obj: unknown): obj is Record<string, unknown> {
    return typeof obj === 'object' && obj !== null;
  }

  /**
   * List contacts with pagination.
   */
  async listContacts(isActive?: boolean, page = 1, limit = 50): Promise<{ data: Contact[]; total: number }> {
    const whereClause = isActive === undefined ? {} : { isActive };
    const [data, total] = await this.contactRepository.findAndCount({
      where: whereClause,
      relations: ['company'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { data, total };
  }

  async getContactById(id: string): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { id },
      relations: ['company', 'deals'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact with id ${id} not found`);
    }

    return contact;
  }

  async createContact(dto: CreateContactDto): Promise<Contact> {
    const safeName = dto.name && dto.name.toString().trim() ? dto.name : 'Unknown';
    const safeType = dto.type || (ContactType.PERSON as ContactType);
    const safeSource = dto.source || (ContactSource.OTHER as ContactSource);

    // Validate custom fields if provided
    if (dto.customFields) {
      const validation = await this.customFieldsService.validateCustomFields(
        'contact',
        dto.customFields
      );
      if (!validation.isValid) {
        const errorMessages = Object.entries(validation.errors)
          .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
          .join('; ');
        throw new BadRequestException(`Custom fields validation failed: ${errorMessages}`);
      }
    }

    let resolvedCompany: Company | undefined = undefined;

    if (dto.companyId && this.companiesService) {
      resolvedCompany = await this.companiesService.findOne(dto.companyId) || undefined;
    }

    const contact = this.contactRepository.create({
      ...dto,
      name: safeName,
      type: safeType,
      source: safeSource,
      company: resolvedCompany || undefined,
    });
    const saved = (await this.contactRepository.save(contact)) as unknown as Contact;

    // Log creation in contact_activities
    try {
      const activity = this.activityRepository.create({
        contactId: saved.id,
        type: ActivityType.SYSTEM,
        title: 'Контакт создан',
        description: `Контакт создан: ${saved.name || saved.id}`,
        metadata: { createdBy: (dto as any).createdBy || null }
      });
      await this.activityRepository.save(activity);
    } catch (err) {
      console.warn('Failed to write contact creation activity:', err?.message || err);
    }

    // Отправляем нотификацию о создании контакта
    if (this.notificationService) {
      try {
        const createdBy = (dto as any).createdBy || 'admin';
        await this.notificationService.createSystemNotification(
          NotificationType.SYSTEM_REMINDER,
          'Новый контакт',
          `Создан новый контакт: ${saved.name}`,
          createdBy,
          { contactId: saved.id, contactName: saved.name, contactEmail: saved.email },
          NotificationPriority.LOW
        );
      } catch (err) {
        console.warn('Failed to send contact creation notification:', err?.message || err);
      }
    }

    return saved;
  }

  async updateContact(id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.getContactById(id);
    // preserve snapshot for change detection
    const beforeSnapshot = { ...(contact as any) };

    // Validate custom fields if provided
    if (dto.customFields) {
      const validation = await this.customFieldsService.validateCustomFields(
        'contact',
        dto.customFields
      );
      if (!validation.isValid) {
        const errorMessages = Object.entries(validation.errors)
          .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
          .join('; ');
        throw new BadRequestException(`Custom fields validation failed: ${errorMessages}`);
      }
    }

    // Prevent assigning removed fields directly. Resolve company if companyId provided.
  const payload = { ...((dto as unknown) as Record<string, unknown>) };
  delete payload.companyId;
  delete payload.companyName;
    Object.assign(contact, payload);

    // check if caller provided a companyId (still supported in DTO) and resolve it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybe = dto as any;
    if (maybe.companyId && this.companiesService) {
      try {
        const found = await this.companiesService.findOne(maybe.companyId);
        if (found) {
          // assign relation
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          contact.company = found;
        } else {
          console.warn('[updateContact] provided companyId not found:', maybe.companyId);
        }
      } catch (err) {
        console.warn('[updateContact] company lookup failed:', err?.message || err);
      }
    }

    if (payload.lastContactDate && (typeof payload.lastContactDate === 'string' || typeof payload.lastContactDate === 'number' || payload.lastContactDate instanceof Date)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contact.lastContactDate = new Date((payload.lastContactDate as any));
    }

    const saved = await this.contactRepository.save(contact);

    // Invalidate name resolver cache for phone numbers
    await this.invalidateContactPhoneCache(beforeSnapshot, saved);

    // Write an activity record describing the update
    let changed: string[] = [];
    try {
      const changedKeys = Object.keys((dto as unknown) as Record<string, unknown>);
      changed = changedKeys.filter((k) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const before = (beforeSnapshot as any)[k];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const after = (dto as any)[k];
        try {
          return JSON.stringify(before) !== JSON.stringify(after);
        } catch (e) {
          return String(before) !== String(after);
        }
      });

      const activity = this.activityRepository.create({
        contactId: saved.id,
        type: ActivityType.SYSTEM,
        title: 'Контакт обновлён',
        description: `Обновлены поля: ${changed.join(', ')}`,
        metadata: { changedFields: changed }
      });
      await this.activityRepository.save(activity);
    } catch (err) {
      console.warn('Failed to write contact update activity:', err?.message || err);
    }

    // Отправляем нотификацию об обновлении контакта
    if (this.notificationService && changed.length > 0) {
      try {
        const updatedBy = (dto as any).updatedBy || 'admin';
        await this.notificationService.createSystemNotification(
          NotificationType.SYSTEM_REMINDER,
          'Контакт обновлён',
          `Контакт "${saved.name}" обновлён. Изменены поля: ${changed.join(', ')}`,
          updatedBy,
          { contactId: saved.id, contactName: saved.name, changedFields: changed },
          NotificationPriority.LOW
        );
      } catch (err) {
        console.warn('Failed to send contact update notification:', err?.message || err);
      }
    }

    return saved;
  }

  async deleteContact(id: string): Promise<void> {
    const contact = await this.getContactById(id);
    
    // Отправляем нотификацию об удалении контакта
    if (this.notificationService) {
      try {
        await this.notificationService.createSystemNotification(
          NotificationType.SYSTEM_REMINDER,
          'Контакт удалён',
          `Контакт "${contact.name}" удалён из системы`,
          'admin',
          { contactId: contact.id, contactName: contact.name },
          NotificationPriority.LOW
        );
      } catch (err) {
        console.warn('Failed to send contact deletion notification:', err?.message || err);
      }
    }
    
    await this.contactRepository.remove(contact);
  }

  // Специальные операции
  async blacklistContact(id: string, reason: string): Promise<Contact> {
    return this.updateContact(id, {
      isBlacklisted: true,
      blacklistReason: reason,
      isActive: false,
    });
  }

  async unblacklistContact(id: string): Promise<Contact> {
    return this.updateContact(id, {
      isBlacklisted: false,
      blacklistReason: null,
      isActive: true,
    });
  }

  async assignContact(id: string, managerId: string): Promise<Contact> {
    return this.updateContact(id, { assignedTo: managerId });
  }

  async updateLastContactDate(id: string): Promise<Contact> {
    return this.updateContact(id, {
      lastContactDate: new Date().toISOString(),
    });
  }

  // Фильтрация и поиск
  async getContactsByType(type: ContactType): Promise<Contact[]> {
    return this.contactRepository.find({
      where: { type, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getContactsBySource(source: ContactSource): Promise<Contact[]> {
    return this.contactRepository.find({
      where: { source, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getContactsByManager(managerId: string): Promise<Contact[]> {
    return this.contactRepository.find({
      where: { assignedTo: managerId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getContactsByCompany(companyName: string): Promise<Contact[]> {
    // TODO: Обновить после добавления связи с Company entity
    return this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.company', 'company')
      .where('company.name ILIKE :companyName', { companyName: `%${companyName}%` })
      .andWhere('contact.isActive = :isActive', { isActive: true })
      .orderBy('contact.createdAt', 'DESC')
      .getMany();
  }

  async getContactsByTag(tag: string): Promise<Contact[]> {
    return this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.isActive = :isActive', { isActive: true })
      .andWhere(':tag = ANY(contact.tags)', { tag })
      .orderBy('contact.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Search contacts by query. Optionally filter by isActive.
   */
  async searchContacts(query: string, isActive?: boolean): Promise<Contact[]> {
    const q = `%${query}%`;
    const qb = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.company', 'company')
      .andWhere(
        '(contact.name ILIKE :q OR contact.email ILIKE :q OR contact.phone ILIKE :q OR company.name ILIKE :q)',
        { q }
      )
      .orderBy('contact.createdAt', 'DESC');

    if (isActive !== undefined) {
      qb.andWhere('contact.isActive = :isActive', { isActive });
    }

    return qb.getMany();
  }

  async getRecentContacts(limit = 10): Promise<Contact[]> {
    return this.contactRepository.find({
      where: { isActive: true },
      order: { lastContactDate: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
  }

  async getContactsWithoutActivity(days = 30): Promise<Contact[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.isActive = :isActive', { isActive: true })
      .andWhere(
        '(contact.lastContactDate IS NULL OR contact.lastContactDate < :cutoffDate)',
        { cutoffDate }
      )
      .orderBy('contact.lastContactDate', 'ASC')
      .getMany();
  }

  // Аналитика
  async getContactsStats() {
    const total = await this.contactRepository.count({
      where: { isActive: true },
    });

    const byType = await this.contactRepository
      .createQueryBuilder('contact')
      .select('contact.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('contact.isActive = :isActive', { isActive: true })
      .groupBy('contact.type')
      .getRawMany();

    const bySource = await this.contactRepository
      .createQueryBuilder('contact')
      .select('contact.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('contact.isActive = :isActive', { isActive: true })
      .groupBy('contact.source')
      .getRawMany();

    const blacklisted = await this.contactRepository.count({
      where: { isBlacklisted: true },
    });

    return {
      total,
      blacklisted,
      byType,
      bySource,
    };
  }

  // Дедупликация
  async findDuplicates(): Promise<Contact[][]> {
    // Находим дубликаты по email
    const duplicatesByEmail = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.email IS NOT NULL')
      .andWhere('contact.isActive = :isActive', { isActive: true })
      .orderBy('contact.email')
      .getMany();

    const emailGroups: Record<string, Contact[]> = {};
    duplicatesByEmail.forEach(contact => {
      if (contact.email) {
        if (!emailGroups[contact.email]) {
          emailGroups[contact.email] = [];
        }
        emailGroups[contact.email].push(contact);
      }
    });

    // Возвращаем только группы с дубликатами
    return Object.values(emailGroups).filter(group => group.length > 1);
  }

  // === Активность контактов ===
  async getContactActivity(contactId: string, page?: number, pageSize?: number): Promise<{ items: ContactActivity[]; total: number }> {
    if (page && pageSize) {
      const skip = (page - 1) * pageSize;
      const [items, total] = await this.activityRepository.findAndCount({
        where: { contactId },
        order: { createdAt: 'DESC' },
        skip,
        take: pageSize,
      });

      return { items, total };
    }

    const items = await this.activityRepository.find({
      where: { contactId },
      order: { createdAt: 'DESC' },
    });

    return { items, total: items.length };
  }

  async addContactActivity(contactId: string, dto: CreateActivityDto): Promise<ContactActivity> {
    // Проверяем существование контакта
    const contact = await this.getContactById(contactId);
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${contactId} not found`);
    }

    const activity = this.activityRepository.create({
      contactId,
      type: dto.type,
      title: dto.title,
      description: dto.description,
      metadata: dto.metadata,
    });

    return this.activityRepository.save(activity);
  }

  /**
   * Search contacts with custom field filters
   * @param filters Object with customFields as key-value pairs or operators
   * Example: { customFields: { customer_type: 'vip', budget: { operator: 'greater', value: 1000 } } }
   */
  async searchContactsByCustomFields(
    filters: Record<string, any>,
    page = 1,
    limit = 50
  ): Promise<{ data: Contact[]; total: number }> {
    const qb = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.company', 'company')
      .where('contact.isActive = :isActive', { isActive: true });

    // Apply custom field filters
    Object.entries(filters).forEach(([field, value], index) => {
      if (value && typeof value === 'object' && 'operator' in value) {
        // Complex filter with operator
        const { operator, value: filterValue } = value;
        const paramKey = `customField${index}`;

        switch (operator) {
          case 'equals':
            qb.andWhere(`contact.customFields->>'${field}' = :${paramKey}`, {
              [paramKey]: filterValue,
            });
            break;
          case 'contains':
            qb.andWhere(`contact.customFields->>'${field}' ILIKE :${paramKey}`, {
              [paramKey]: `%${filterValue}%`,
            });
            break;
          case 'greater':
            qb.andWhere(`(contact.customFields->>'${field}')::numeric > :${paramKey}`, {
              [paramKey]: filterValue,
            });
            break;
          case 'less':
            qb.andWhere(`(contact.customFields->>'${field}')::numeric < :${paramKey}`, {
              [paramKey]: filterValue,
            });
            break;
          case 'between':
            if (Array.isArray(filterValue) && filterValue.length === 2) {
              qb.andWhere(
                `(contact.customFields->>'${field}')::numeric BETWEEN :${paramKey}Min AND :${paramKey}Max`,
                {
                  [`${paramKey}Min`]: filterValue[0],
                  [`${paramKey}Max`]: filterValue[1],
                }
              );
            }
            break;
          case 'in':
            if (Array.isArray(filterValue)) {
              qb.andWhere(`contact.customFields->>'${field}' IN (:...${paramKey})`, {
                [paramKey]: filterValue,
              });
            }
            break;
          case 'exists':
            qb.andWhere(`contact.customFields ? '${field}'`);
            break;
        }
      } else {
        // Simple equality filter
        const paramKey = `customField${index}`;
        qb.andWhere(`contact.customFields->>'${field}' = :${paramKey}`, {
          [paramKey]: value,
        });
      }
    });

    qb.orderBy('contact.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * Invalidate name resolver cache when contact phone numbers change
   */
  private async invalidateContactPhoneCache(
    before: Partial<Contact>,
    after: Contact,
  ): Promise<void> {
    if (!this.nameResolverService) return;

    const phoneFields = ['phone', 'mobilePhone', 'workPhone'] as const;
    const phonesToInvalidate = new Set<string>();

    for (const field of phoneFields) {
      const oldPhone = before[field];
      const newPhone = after[field];

      // Invalidate old phone if it changed
      if (oldPhone && oldPhone !== newPhone) {
        phonesToInvalidate.add(oldPhone);
      }
      // Invalidate new phone (to refresh cache with updated contact info)
      if (newPhone && oldPhone !== newPhone) {
        phonesToInvalidate.add(newPhone);
      }
    }

    for (const phone of phonesToInvalidate) {
      await this.nameResolverService.invalidatePhone(phone);
    }
  }
}
