import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisClientType } from 'redis';
import { Contact } from '../../contacts/contact.entity';
import { User } from '../../user/user.entity';

export interface ResolvedName {
  displayName: string;
  type: 'operator' | 'contact' | 'unknown';
  contactId?: string;
  userId?: number;
  originalValue: string;
}

const CACHE_PREFIX = 'name-resolver:';
const CACHE_TTL_SECONDS = 5 * 60; // 5 minutes

@Injectable()
export class NameResolverService {
  private readonly logger = new Logger(NameResolverService.name);

  constructor(
    @InjectRepository(Contact) private readonly contactRepo: Repository<Contact>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  /**
   * Resolve phone number to contact name
   */
  async resolvePhoneNumber(phone: string): Promise<ResolvedName> {
    if (!phone) {
      return { displayName: 'Unknown', type: 'unknown', originalValue: phone };
    }

    // Check cache
    const cacheKey = `${CACHE_PREFIX}phone:${phone}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = this.normalizePhone(phone);
    
    try {
      // Search contact by phone
      const contact = await this.contactRepo
        .createQueryBuilder('contact')
        .where("REPLACE(REPLACE(REPLACE(contact.phone, ' ', ''), '-', ''), '+', '') LIKE :phone", { 
          phone: `%${normalizedPhone}%` 
        })
        .orWhere("REPLACE(REPLACE(REPLACE(contact.mobilePhone, ' ', ''), '-', ''), '+', '') LIKE :phone", { 
          phone: `%${normalizedPhone}%` 
        })
        .orWhere("REPLACE(REPLACE(REPLACE(contact.workPhone, ' ', ''), '-', ''), '+', '') LIKE :phone", { 
          phone: `%${normalizedPhone}%` 
        })
        .getOne();

      if (contact) {
        const displayName = this.formatContactName(contact);
        const result: ResolvedName = {
          displayName,
          type: 'contact',
          contactId: contact.id,
          originalValue: phone,
        };
        await this.setCache(cacheKey, result);
        return result;
      }
    } catch (err) {
      this.logger.warn(`Failed to resolve phone ${phone}:`, err);
    }

    // No contact found
    const result: ResolvedName = {
      displayName: phone,
      type: 'unknown',
      originalValue: phone,
    };
    await this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Resolve SIP endpoint/extension to user name
   */
  async resolveOperator(sipEndpoint: string): Promise<ResolvedName> {
    if (!sipEndpoint) {
      return { displayName: 'Unknown', type: 'unknown', originalValue: sipEndpoint };
    }

    // Check cache
    const cacheKey = `${CACHE_PREFIX}operator:${sipEndpoint}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    // Extract extension from SIP endpoint (e.g., "PJSIP/operator1" -> "operator1")
    const extension = sipEndpoint.includes('/') 
      ? sipEndpoint.split('/')[1] 
      : sipEndpoint;

    try {
      // Search user by sipEndpointId or username
      const user = await this.userRepo.findOne({
        where: [
          { sipEndpointId: extension },
          { username: extension },
        ],
        select: ['id', 'firstName', 'lastName', 'username', 'sipEndpointId'],
      });

      if (user) {
        const displayName = this.formatUserName(user);
        const result: ResolvedName = {
          displayName,
          type: 'operator',
          userId: user.id,
          originalValue: sipEndpoint,
        };
        await this.setCache(cacheKey, result);
        return result;
      }
    } catch (err) {
      this.logger.warn(`Failed to resolve operator ${sipEndpoint}:`, err);
    }

    // No user found - return original SIP endpoint
    const result: ResolvedName = {
      displayName: extension,
      type: 'operator',
      originalValue: sipEndpoint,
    };
    await this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Batch resolve multiple phone numbers
   */
  async resolvePhoneNumbers(phones: string[]): Promise<Map<string, ResolvedName>> {
    const results = new Map<string, ResolvedName>();
    
    for (const phone of phones) {
      if (phone) {
        results.set(phone, await this.resolvePhoneNumber(phone));
      }
    }
    
    return results;
  }

  /**
   * Batch resolve multiple operators
   */
  async resolveOperators(sipEndpoints: string[]): Promise<Map<string, ResolvedName>> {
    const results = new Map<string, ResolvedName>();
    
    for (const endpoint of sipEndpoints) {
      if (endpoint) {
        results.set(endpoint, await this.resolveOperator(endpoint));
      }
    }
    
    return results;
  }

  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except leading +
    return phone.replace(/[^\d]/g, '');
  }

  private formatContactName(contact: Contact): string {
    if (contact.firstName && contact.lastName) {
      return `${contact.firstName} ${contact.lastName}`;
    }
    if (contact.name) {
      return contact.name;
    }
    return contact.firstName || contact.lastName || 'Unknown';
  }

  private formatUserName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.username || 'Unknown';
  }

  private async getFromCache(key: string): Promise<ResolvedName | null> {
    try {
      const data = await this.redis.get(key);
      if (data) {
        return JSON.parse(data) as ResolvedName;
      }
    } catch (err) {
      this.logger.warn(`Redis cache get error for key ${key}:`, err);
    }
    return null;
  }

  private async setCache(key: string, value: ResolvedName): Promise<void> {
    try {
      await this.redis.setEx(key, CACHE_TTL_SECONDS, JSON.stringify(value));
    } catch (err) {
      this.logger.warn(`Redis cache set error for key ${key}:`, err);
    }
  }

  /**
   * Clear cache (useful for testing or after contact updates)
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } catch (err) {
      this.logger.warn('Failed to clear cache:', err);
    }
  }

  /**
   * Invalidate cache for a specific phone number
   */
  async invalidatePhone(phone: string): Promise<void> {
    try {
      await this.redis.del(`${CACHE_PREFIX}phone:${phone}`);
    } catch (err) {
      this.logger.warn(`Failed to invalidate phone cache for ${phone}:`, err);
    }
  }

  /**
   * Invalidate cache for a specific operator
   */
  async invalidateOperator(sipEndpoint: string): Promise<void> {
    try {
      await this.redis.del(`${CACHE_PREFIX}operator:${sipEndpoint}`);
    } catch (err) {
      this.logger.warn(`Failed to invalidate operator cache for ${sipEndpoint}:`, err);
    }
  }
}
