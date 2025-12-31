import { Injectable, NotFoundException, Optional, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In, LessThan } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Contact, ContactType, ContactSource } from './entities/contact.entity';
import { ContactActivity, ContactActivityType } from './entities/contact-activity.entity';
import { SERVICES, CONTACT_EVENTS } from '@crm/contracts';
import {
  CreateContactDto,
  UpdateContactDto,
  ContactFilterDto,
  ContactListResponseDto,
  ContactResponseDto,
  ContactStatsDto,
  CreateContactActivityDto,
  ContactActivityListDto,
} from '@crm/contracts';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(ContactActivity)
    private readonly activityRepository: Repository<ContactActivity>,
    @Optional() @Inject(SERVICES.NOTIFICATION)
    private readonly notificationClient?: ClientProxy,
  ) {}

  async findAll(filter: ContactFilterDto): Promise<ContactListResponseDto> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.contactRepository.createQueryBuilder('contact');
    queryBuilder.leftJoinAndSelect('contact.company', 'company');

    if (filter.type) {
      queryBuilder.andWhere('contact.type = :type', { type: filter.type });
    }

    if (filter.source) {
      queryBuilder.andWhere('contact.source = :source', { source: filter.source });
    }

    if (filter.managerId) {
      queryBuilder.andWhere('contact.assignedTo = :assignedTo', { assignedTo: filter.managerId });
    }

    if (filter.companyId) {
      queryBuilder.andWhere('contact.companyId = :companyId', { companyId: filter.companyId });
    }

    if (filter.tag) {
      queryBuilder.andWhere('contact.tags ILIKE :tag', { tag: `%${filter.tag}%` });
    }

    if (filter.isActive !== undefined) {
      queryBuilder.andWhere('contact.isActive = :isActive', { isActive: filter.isActive });
    }

    if (filter.isBlacklisted !== undefined) {
      queryBuilder.andWhere('contact.isBlacklisted = :isBlacklisted', { isBlacklisted: filter.isBlacklisted });
    }

    if (filter.search) {
      queryBuilder.andWhere(
        '(contact.name ILIKE :search OR contact.email ILIKE :search OR contact.phone ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    queryBuilder.orderBy('contact.createdAt', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map(this.toResponseDto),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(id: string): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return this.toResponseDto(contact);
  }

  async findByPhone(phone: string): Promise<ContactResponseDto | null> {
    const contact = await this.contactRepository.findOne({
      where: [
        { phone: ILike(`%${phone}%`) },
        { mobilePhone: ILike(`%${phone}%`) },
        { workPhone: ILike(`%${phone}%`) },
      ],
      relations: ['company'],
    });

    return contact ? this.toResponseDto(contact) : null;
  }

  async search(query: string, page = 1, limit = 20): Promise<ContactListResponseDto> {
    const skip = (page - 1) * limit;
    const searchPattern = `%${query}%`;

    const [items, total] = await this.contactRepository.findAndCount({
      where: [
        { name: ILike(searchPattern) },
        { email: ILike(searchPattern) },
        { phone: ILike(searchPattern) },
        { mobilePhone: ILike(searchPattern) },
      ],
      relations: ['company'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map(this.toResponseDto),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findRecent(limit = 10): Promise<ContactResponseDto[]> {
    const contacts = await this.contactRepository.find({
      where: { isActive: true },
      order: { lastContactDate: 'DESC' },
      take: limit,
      relations: ['company'],
    });

    return contacts.map(this.toResponseDto);
  }

  async findInactive(days: number): Promise<ContactResponseDto[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const contacts = await this.contactRepository.find({
      where: {
        isActive: true,
        lastContactDate: LessThan(cutoffDate),
      },
      relations: ['company'],
    });

    return contacts.map(this.toResponseDto);
  }

  async getStats(): Promise<ContactStatsDto> {
    const total = await this.contactRepository.count();
    const activeCount = await this.contactRepository.count({ where: { isActive: true } });
    const blacklistedCount = await this.contactRepository.count({ where: { isBlacklisted: true } });

    // Count by type
    const typeStats = await this.contactRepository
      .createQueryBuilder('contact')
      .select('contact.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('contact.type')
      .getRawMany();

    const byType = {} as Record<ContactType, number>;
    for (const stat of typeStats) {
      byType[stat.type as ContactType] = parseInt(stat.count);
    }

    // Count by source
    const sourceStats = await this.contactRepository
      .createQueryBuilder('contact')
      .select('contact.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('contact.source IS NOT NULL')
      .groupBy('contact.source')
      .getRawMany();

    const bySource = {} as Record<ContactSource, number>;
    for (const stat of sourceStats) {
      bySource[stat.source as ContactSource] = parseInt(stat.count);
    }

    // Recent contacts (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentCount = await this.contactRepository.count({
      where: { createdAt: LessThan(weekAgo) },
    });

    return {
      total,
      byType,
      bySource,
      activeCount,
      blacklistedCount,
      recentCount,
    };
  }

  async getDuplicates(): Promise<ContactResponseDto[][]> {
    // Find contacts with duplicate emails
    const duplicates = await this.contactRepository
      .createQueryBuilder('contact')
      .select('contact.email')
      .addSelect('COUNT(*)', 'count')
      .where('contact.email IS NOT NULL')
      .groupBy('contact.email')
      .having('COUNT(*) > 1')
      .getRawMany();

    const result: ContactResponseDto[][] = [];

    for (const dup of duplicates) {
      const contacts = await this.contactRepository.find({
        where: { email: dup.email },
        relations: ['company'],
      });
      result.push(contacts.map(this.toResponseDto));
    }

    return result;
  }

  async create(dto: CreateContactDto): Promise<ContactResponseDto> {
    const contact = this.contactRepository.create({
      ...dto,
      type: (dto.type as ContactType) || ContactType.PERSON,
      source: dto.source as ContactSource,
    } as Partial<Contact>);

    const saved = await this.contactRepository.save(contact) as Contact;

    // Log activity
    await this.addActivity(saved.id, {
      type: ContactActivityType.SYSTEM,
      title: 'Contact created',
      description: `Contact "${saved.name}" was created`,
    });

    // Emit event
    this.emitEvent(CONTACT_EVENTS.CREATED, { contact: this.toResponseDto(saved) });

    return this.toResponseDto(saved);
  }

  async update(id: string, dto: UpdateContactDto): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findOne({ where: { id } });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    const changes = Object.keys(dto).filter(
      (key) => dto[key as keyof UpdateContactDto] !== contact[key as keyof Contact]
    );

    Object.assign(contact, dto);
    const saved = await this.contactRepository.save(contact);

    // Log activity
    if (changes.length > 0) {
      await this.addActivity(saved.id, {
        type: ContactActivityType.SYSTEM,
        title: 'Contact updated',
        description: `Fields updated: ${changes.join(', ')}`,
        metadata: { changes },
      });
    }

    // Emit event
    this.emitEvent(CONTACT_EVENTS.UPDATED, {
      contact: this.toResponseDto(saved),
      changes,
    });

    return this.toResponseDto(saved);
  }

  async remove(id: string): Promise<void> {
    const contact = await this.contactRepository.findOne({ where: { id } });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    await this.contactRepository.remove(contact);

    // Emit event
    this.emitEvent(CONTACT_EVENTS.DELETED, {
      contactId: id,
      contactName: contact.name,
    });
  }

  async blacklist(id: string, reason: string): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findOne({ where: { id } });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    contact.isBlacklisted = true;
    contact.blacklistReason = reason;
    const saved = await this.contactRepository.save(contact);

    await this.addActivity(saved.id, {
      type: ContactActivityType.SYSTEM,
      title: 'Contact blacklisted',
      description: `Reason: ${reason}`,
    });

    return this.toResponseDto(saved);
  }

  async unblacklist(id: string): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findOne({ where: { id } });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    contact.isBlacklisted = false;
    contact.blacklistReason = undefined;
    const saved = await this.contactRepository.save(contact);

    await this.addActivity(saved.id, {
      type: ContactActivityType.SYSTEM,
      title: 'Contact removed from blacklist',
    });

    return this.toResponseDto(saved);
  }

  async assign(id: string, managerId: string): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findOne({ where: { id } });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    const previousAssignedTo = contact.assignedTo;
    contact.assignedTo = managerId;
    const saved = await this.contactRepository.save(contact);

    await this.addActivity(saved.id, {
      type: ContactActivityType.SYSTEM,
      title: 'Contact assigned',
      description: `Assigned to manager ${managerId}`,
      metadata: { previousAssignedTo, newAssignedTo: managerId },
    });

    return this.toResponseDto(saved);
  }

  async touch(id: string): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findOne({ where: { id } });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    contact.lastContactDate = new Date();
    const saved = await this.contactRepository.save(contact);

    return this.toResponseDto(saved);
  }

  // Activity methods
  async getActivity(contactId: string, page = 1, limit = 20): Promise<ContactActivityListDto> {
    const skip = (page - 1) * limit;

    const [items, total] = await this.activityRepository.findAndCount({
      where: { contactId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items: items.map((a) => ({
        id: a.id,
        contactId: a.contactId,
        type: a.type as any,
        title: a.title,
        description: a.description,
        performedById: a.performedById,
        performedByName: a.performedByName,
        metadata: a.metadata,
        createdAt: a.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async addActivity(contactId: string, dto: CreateContactActivityDto): Promise<void> {
    const activity = this.activityRepository.create({
      contactId,
      type: dto.type as ContactActivityType,
      title: dto.title,
      description: dto.description,
      performedById: dto.performedById,
      performedByName: dto.performedByName,
      metadata: dto.metadata,
    });

    await this.activityRepository.save(activity);
  }

  // Helper methods
  private toResponseDto(contact: Contact): ContactResponseDto {
    return {
      id: contact.id,
      type: contact.type as any,
      name: contact.name,
      firstName: contact.firstName,
      lastName: contact.lastName,
      middleName: contact.middleName,
      position: contact.position,
      companyId: contact.companyId,
      companyName: contact.company?.name,
      email: contact.email,
      phone: contact.phone,
      mobilePhone: contact.mobilePhone,
      workPhone: contact.workPhone,
      website: contact.website,
      address: contact.address,
      city: undefined, // No city column in DB
      source: contact.source as any,
      managerId: contact.assignedTo,
      tags: contact.tags ? contact.tags.split(',').map(t => t.trim()) : undefined,
      notes: contact.notes,
      customFields: contact.customFields,
      isActive: contact.isActive,
      isBlacklisted: contact.isBlacklisted,
      blacklistReason: contact.blacklistReason,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      lastContactDate: contact.lastContactDate,
    };
  }

  private emitEvent(eventType: string, payload: Record<string, unknown>): void {
    if (this.notificationClient) {
      this.notificationClient.emit(eventType, {
        type: eventType,
        timestamp: new Date().toISOString(),
        payload,
      });
    }
  }
}
