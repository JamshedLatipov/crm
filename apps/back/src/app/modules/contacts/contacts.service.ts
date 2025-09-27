import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Contact, ContactType, ContactSource } from './contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  async listContacts(): Promise<Contact[]> {
    return this.contactRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getContactById(id: string): Promise<Contact> {
    const contact = await this.contactRepository.findOne({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with id ${id} not found`);
    }

    return contact;
  }

  async createContact(dto: CreateContactDto): Promise<Contact> {
    const contact = this.contactRepository.create(dto);
    return this.contactRepository.save(contact);
  }

  async updateContact(id: string, dto: UpdateContactDto): Promise<Contact> {
    const contact = await this.getContactById(id);

    Object.assign(contact, dto);

    if (dto.lastContactDate) {
      contact.lastContactDate = new Date(dto.lastContactDate);
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
    return this.contactRepository.find({
      where: { company: ILike(`%${companyName}%`), isActive: true },
      order: { createdAt: 'DESC' },
    });
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
    return this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.isActive = :isActive', { isActive: true })
      .andWhere(
        '(contact.name ILIKE :query OR contact.email ILIKE :query OR contact.phone ILIKE :query OR contact.company ILIKE :query)',
        { query: `%${query}%` }
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
