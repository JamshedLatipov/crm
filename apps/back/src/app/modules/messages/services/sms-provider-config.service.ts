import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsProviderConfig } from '../entities/sms-provider-config.entity';
import { SmsProviderFactory } from './providers/sms-provider.factory';

/**
 * Сервис для управления конфигурациями SMS-провайдеров
 */
@Injectable()
export class SmsProviderConfigService {
  private readonly logger = new Logger(SmsProviderConfigService.name);

  constructor(
    @InjectRepository(SmsProviderConfig)
    private readonly configRepository: Repository<SmsProviderConfig>,
    private readonly providerFactory: SmsProviderFactory
  ) {}

  /**
   * Получить все провайдеры
   */
  async findAll(): Promise<SmsProviderConfig[]> {
    return this.configRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получить активного провайдера
   */
  async findActive(): Promise<SmsProviderConfig | null> {
    const provider = await this.configRepository.findOne({
      where: { isActive: true },
    });

    if (!provider) {
      this.logger.warn('No active SMS provider found');
      return null;
    }

    return provider;
  }

  /**
   * Получить провайдера по ID
   */
  async findOne(id: string): Promise<SmsProviderConfig> {
    const provider = await this.configRepository.findOne({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }

    return provider;
  }

  /**
   * Получить провайдера по имени
   */
  async findByName(name: string): Promise<SmsProviderConfig | null> {
    return this.configRepository.findOne({
      where: { name },
    });
  }

  /**
   * Создать нового провайдера
   */
  async create(data: Partial<SmsProviderConfig>): Promise<SmsProviderConfig> {
    // Проверяем уникальность имени
    const existing = await this.findByName(data.name);
    if (existing) {
      throw new BadRequestException(`Provider with name ${data.name} already exists`);
    }

    // Валидируем конфигурацию
    const validation = this.providerFactory.validateConfig(data as SmsProviderConfig);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    const provider = this.configRepository.create(data);
    return this.configRepository.save(provider);
  }

  /**
   * Обновить провайдера
   */
  async update(id: string, data: Partial<SmsProviderConfig>): Promise<SmsProviderConfig> {
    const provider = await this.findOne(id);

    // Если обновляется конфиг, валидируем его
    if (data.config) {
      const updatedProvider = { ...provider, ...data };
      const validation = this.providerFactory.validateConfig(updatedProvider as SmsProviderConfig);
      if (!validation.valid) {
        throw new BadRequestException(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
    }

    Object.assign(provider, data);
    return this.configRepository.save(provider);
  }

  /**
   * Удалить провайдера
   */
  async remove(id: string): Promise<void> {
    const provider = await this.findOne(id);

    if (provider.isActive) {
      throw new BadRequestException('Cannot delete active provider');
    }

    await this.configRepository.remove(provider);
  }

  /**
   * Активировать провайдера (деактивирует остальных)
   */
  async activate(id: string): Promise<SmsProviderConfig> {
    const provider = await this.findOne(id);

    // Деактивируем всех остальных
    await this.configRepository.update(
      { isActive: true },
      { isActive: false }
    );

    // Активируем выбранного
    provider.isActive = true;
    await this.configRepository.save(provider);

    this.logger.log(`Activated provider: ${provider.name}`);
    return provider;
  }

  /**
   * Деактивировать провайдера
   */
  async deactivate(id: string): Promise<SmsProviderConfig> {
    const provider = await this.findOne(id);
    provider.isActive = false;
    await this.configRepository.save(provider);

    this.logger.log(`Deactivated provider: ${provider.name}`);
    return provider;
  }

  /**
   * Тестовая отправка SMS через провайдера
   */
  async testProvider(id: string, phoneNumber: string, message: string): Promise<any> {
    const config = await this.findOne(id);

    // Создаем экземпляр провайдера
    const provider = this.providerFactory.create(config);

    // Проверяем здоровье
    const isHealthy = await provider.isHealthy();
    if (!isHealthy) {
      throw new BadRequestException('Provider is not healthy');
    }

    // Отправляем тестовое сообщение
    const result = await provider.sendSms({
      phoneNumber,
      message,
    });

    return {
      providerName: provider.getName(),
      capabilities: provider.getCapabilities(),
      testResult: result,
    };
  }
}
