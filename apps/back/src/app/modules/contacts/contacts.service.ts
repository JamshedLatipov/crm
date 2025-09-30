import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact, ContactType, ContactSource } from './contact.entity';
import { Company } from '../companies/entities/company.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CompaniesService } from '../companies/services/companies.service';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    private readonly companiesService?: CompaniesService,
  ) {}

  // Local helper to avoid spreading 'any' directly in code and satisfy lint rules
  private typeGuardAny(obj: unknown): obj is Record<string, unknown> {
    return typeof obj === 'object' && obj !== null;
  }

  async listContacts(): Promise<Contact[]> {
    return this.contactRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
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
    
    return saved;
  }

  async updateContact(id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.getContactById(id);

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

    return this.contactRepository.save(contact);
  }

  async deleteContact(id: string): Promise<void> {
    const contact = await this.getContactById(id);
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

  async searchContacts(query: string): Promise<Contact[]> {
    const q = `%${query}%`;
    return this.contactRepository
      .createQueryBuilder('contact')
      .leftJoinAndSelect('contact.company', 'company')
      .where('contact.isActive = :isActive', { isActive: true })
      .andWhere(
        '(contact.name ILIKE :q OR contact.email ILIKE :q OR contact.phone ILIKE :q OR company.name ILIKE :q)',
        { q }
      )
      .orderBy('contact.createdAt', 'DESC')
      .getMany();
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
}
