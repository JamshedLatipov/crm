import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerCache } from '@libs/shared/sto-types';
import { CrmApiService } from '../../crm-integration/services/crm-api.service';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CustomerSyncService {
  private readonly logger = new Logger(CustomerSyncService.name);

  constructor(
    @InjectRepository(CustomerCache)
    private readonly customerCacheRepo: Repository<CustomerCache>,
    private readonly crmApiService: CrmApiService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Sync customer data from CRM to local cache
   */
  async syncCustomerFromCrm(customerId: string): Promise<CustomerCache> {
    try {
      this.logger.log(`Syncing customer from CRM: ${customerId}`);

      // Fetch from CRM API
      const crmCustomer = await this.crmApiService.getContact(customerId);

      // Update or create in local cache
      let cachedCustomer = await this.customerCacheRepo.findOne({
        where: { crmContactId: customerId },
      });

      if (!cachedCustomer) {
        cachedCustomer = this.customerCacheRepo.create({
          crmContactId: customerId,
          phone: '',
        });
      }

      // Update fields
      cachedCustomer.phone = crmCustomer.phone;
      cachedCustomer.name = crmCustomer.name;
      cachedCustomer.email = crmCustomer.email;
      cachedCustomer.lastSyncAt = new Date();

      await this.customerCacheRepo.save(cachedCustomer);

      // Update Redis cache
      await this.cacheManager.set(
        `customer:${customerId}`,
        cachedCustomer,
        3600000, // 1 hour TTL
      );

      this.logger.log(`Customer synced successfully: ${customerId}`);
      return cachedCustomer;
    } catch (error: any) {
      this.logger.error(`Failed to sync customer ${customerId}:`, error?.message);
      throw error;
    }
  }

  /**
   * Find customer by phone (check local cache first, then CRM)
   */
  async findCustomerByPhone(phone: string): Promise<CustomerCache | null> {
    try {
      // Check Redis cache first
      const cached = await this.cacheManager.get<CustomerCache>(`customer:phone:${phone}`);
      if (cached) {
        this.logger.log(`Customer found in Redis cache: ${phone}`);
        return cached;
      }

      // Check local database
      let customer = await this.customerCacheRepo.findOne({
        where: { phone },
      });

      if (customer) {
        // Check if cache is stale (older than 1 hour)
        const oneHourAgo = new Date(Date.now() - 3600000);
        if (customer.lastSyncAt < oneHourAgo) {
          this.logger.log(`Customer cache is stale, re-syncing: ${phone}`);
          customer = await this.syncCustomerFromCrm(customer.crmContactId || '');
        }

        // Update Redis cache
        await this.cacheManager.set(`customer:phone:${phone}`, customer, 3600000);
        return customer;
      }

      // Not in cache, fetch from CRM
      this.logger.log(`Customer not in cache, fetching from CRM: ${phone}`);
      const crmCustomer = await this.crmApiService.findContactByPhone(phone);

      if (!crmCustomer) {
        return null;
      }

      // Create new cache entry
      customer = this.customerCacheRepo.create({
        crmContactId: crmCustomer.id,
        phone: crmCustomer.phone,
        name: crmCustomer.name,
        email: crmCustomer.email,
        lastSyncAt: new Date(),
      });

      await this.customerCacheRepo.save(customer);

      // Update Redis cache
      await this.cacheManager.set(`customer:phone:${phone}`, customer, 3600000);
      await this.cacheManager.set(`customer:${customer.crmContactId}`, customer, 3600000);

      this.logger.log(`Customer fetched from CRM and cached: ${phone}`);
      return customer;
    } catch (error: any) {
      this.logger.error(`Failed to find customer by phone ${phone}:`, error?.message);
      return null;
    }
  }

  /**
   * Get customer from cache or CRM
   */
  async getCustomer(customerId: string): Promise<CustomerCache | null> {
    try {
      // Check Redis cache first
      const cached = await this.cacheManager.get<CustomerCache>(`customer:${customerId}`);
      if (cached) {
        return cached;
      }

      // Check local database
      let customer = await this.customerCacheRepo.findOne({
        where: { crmContactId: customerId },
      });

      if (customer) {
        // Check if cache is stale
        const oneHourAgo = new Date(Date.now() - 3600000);
        if (customer.lastSyncAt < oneHourAgo) {
          customer = await this.syncCustomerFromCrm(customerId);
        }

        await this.cacheManager.set(`customer:${customerId}`, customer, 3600000);
        return customer;
      }

      // Not in cache, fetch from CRM
      return await this.syncCustomerFromCrm(customerId);
    } catch (error: any) {
      this.logger.error(`Failed to get customer ${customerId}:`, error?.message);
      return null;
    }
  }

  /**
   * Clear customer cache
   */
  async clearCustomerCache(customerId: string) {
    await this.cacheManager.del(`customer:${customerId}`);
    
    const customer = await this.customerCacheRepo.findOne({
      where: { crmContactId: customerId },
    });

    if (customer) {
      await this.cacheManager.del(`customer:phone:${customer.phone}`);
    }

    this.logger.log(`Cache cleared for customer: ${customerId}`);
  }
}
