import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CustomerCache } from '@libs/shared/sto-types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Logger } from '@nestjs/common';

@Injectable()
export class PublicQueueService {
  private readonly logger = new Logger(PublicQueueService.name);
  private readonly RATE_LIMIT_TTL = 1800000; // 30 minutes in milliseconds

  constructor(
    @InjectRepository(CustomerCache)
    private customerCacheRepository: Repository<CustomerCache>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async findOrCreateCustomer(phone: string, name?: string, email?: string): Promise<CustomerCache> {
    let customer = await this.customerCacheRepository.findOne({
      where: { phone },
    });

    if (!customer) {
      customer = this.customerCacheRepository.create({
        phone,
        name,
        email,
      });
      await this.customerCacheRepository.save(customer);
    }

    return customer;
  }

  /**
   * Check if phone number is rate limited (Redis-based)
   */
  async checkRateLimit(phone: string, minutes: number = 30): Promise<boolean> {
    const cacheKey = `rate_limit:phone:${phone}`;
    const cached = await this.cacheManager.get<string>(cacheKey);

    if (cached) {
      this.logger.warn(`Rate limit active for phone: ${phone}`);
      return false; // Rate limited
    }

    return true; // Not rate limited
  }

  /**
   * Set rate limit for phone number (30 minutes)
   */
  async setRateLimit(phone: string): Promise<void> {
    const cacheKey = `rate_limit:phone:${phone}`;
    await this.cacheManager.set(cacheKey, 'limited', this.RATE_LIMIT_TTL);
    this.logger.log(`Rate limit set for phone: ${phone}`);
  }

  /**
   * Clear rate limit (admin override or after cancellation)
   */
  async clearRateLimit(phone: string): Promise<void> {
    const cacheKey = `rate_limit:phone:${phone}`;
    await this.cacheManager.del(cacheKey);
    this.logger.log(`Rate limit cleared for phone: ${phone}`);
  }
}
