import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SmsProviderConfigService } from './sms-provider-config.service';
import { SmsProviderConfig } from '../entities/sms-provider-config.entity';
import { SmsProviderFactory } from './providers/sms-provider.factory';

describe('SmsProviderConfigService', () => {
  let service: SmsProviderConfigService;
  let repository: Repository<SmsProviderConfig>;
  let factory: SmsProviderFactory;

  const mockConfig: Partial<SmsProviderConfig> = {
    id: 'test-id',
    name: 'imon_tj',
    displayName: 'IMON.TJ SMS Service',
    isActive: true,
    config: {
      baseUrl: 'https://sms-service.imon.tj',
      authType: 'custom',
      endpoints: { send: '/api/sms/send' },
      credentials: {
        loginEnv: 'IMON_TJ_LOGIN',
        passwordEnv: 'IMON_TJ_PASSWORD',
      },
      fieldMapping: {
        phone: 'telephone',
        message: 'sms',
      },
      requestFormat: 'json',
      requestMethod: 'POST',
      responseMapping: {
        messageIdField: 'smsID',
      },
    },
    settings: {
      timeout: 10000,
      maxRetries: 3,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  const mockFactory = {
    create: jest.fn(),
    validateConfig: jest.fn().mockReturnValue({ valid: true, errors: [] }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsProviderConfigService,
        {
          provide: getRepositoryToken(SmsProviderConfig),
          useValue: mockRepository,
        },
        {
          provide: SmsProviderFactory,
          useValue: mockFactory,
        },
      ],
    }).compile();

    service = module.get<SmsProviderConfigService>(SmsProviderConfigService);
    repository = module.get<Repository<SmsProviderConfig>>(
      getRepositoryToken(SmsProviderConfig)
    );
    factory = module.get<SmsProviderFactory>(SmsProviderFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all providers', async () => {
      const configs = [mockConfig, { ...mockConfig, id: 'test-id-2' }];
      mockRepository.find.mockResolvedValue(configs);

      const result = await service.findAll();

      expect(result).toEqual(configs);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no providers', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findActive', () => {
    it('should return active provider', async () => {
      mockRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.findActive();

      expect(result).toEqual(mockConfig);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('should return null when no active provider', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findActive();

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return provider by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.findOne('test-id');

      expect(result).toEqual(mockConfig);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      });
    });

    it('should throw NotFoundException when provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findByName', () => {
    it('should return provider by name', async () => {
      mockRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.findByName('imon_tj');

      expect(result).toEqual(mockConfig);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'imon_tj' },
      });
    });

    it('should return null when provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByName('invalid-name');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create new provider', async () => {
      const createDto = {
        name: 'new_provider',
        displayName: 'New Provider',
        config: mockConfig.config,
        settings: mockConfig.settings,
      };

      mockFactory.validateConfig.mockReturnValue({ valid: true, errors: [] });
      mockRepository.create.mockReturnValue(createDto);
      mockRepository.save.mockResolvedValue({ ...createDto, id: 'new-id' });

      const result = await service.create(createDto as any);

      expect(result.id).toBe('new-id');
      expect(mockFactory.validateConfig).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when validation fails', async () => {
      const createDto = {
        name: 'invalid',
        displayName: 'Invalid',
        config: {},
      };

      mockFactory.validateConfig.mockReturnValue({
        valid: false,
        errors: ['Invalid config'],
      });

      await expect(service.create(createDto as any)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('update', () => {
    it('should update existing provider', async () => {
      const updateDto = {
        displayName: 'Updated Name',
      };

      mockRepository.findOne.mockResolvedValue(mockConfig);
      mockRepository.save.mockResolvedValue({
        ...mockConfig,
        ...updateDto,
      });

      const result = await service.update('test-id', updateDto);

      expect(result.displayName).toBe('Updated Name');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-id', {})).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('remove', () => {
    it('should remove provider', async () => {
      const inactiveConfig = { ...mockConfig, isActive: false };
      mockRepository.findOne.mockResolvedValue(inactiveConfig);
      mockRepository.remove.mockResolvedValue(inactiveConfig);

      await service.remove('test-id');

      expect(mockRepository.remove).toHaveBeenCalledWith(inactiveConfig);
    });

    it('should throw NotFoundException when provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('activate', () => {
    it('should activate provider and deactivate others', async () => {
      const inactiveConfig = { ...mockConfig, isActive: false };
      mockRepository.findOne.mockResolvedValue(inactiveConfig);
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.save.mockResolvedValue({ ...inactiveConfig, isActive: true });

      const result = await service.activate('test-id');

      expect(result.isActive).toBe(true);
      expect(mockRepository.update).toHaveBeenCalledWith(
        { isActive: true },
        { isActive: false }
      );
    });

    it('should throw NotFoundException when provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.activate('invalid-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate provider', async () => {
      mockRepository.findOne.mockResolvedValue(mockConfig);
      mockRepository.save.mockResolvedValue({ ...mockConfig, isActive: false });

      const result = await service.deactivate('test-id');

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivate('invalid-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('testProvider', () => {
    it('should test provider and return success', async () => {
      const mockProvider = {
        sendSms: jest.fn().mockResolvedValue({
          success: true,
          messageId: '12345',
        }),
        isHealthy: jest.fn().mockResolvedValue(true),
        getName: jest.fn().mockReturnValue('imon_tj'),
        getCapabilities: jest.fn().mockReturnValue({
          maxMessageLength: 1600,
          supportsDeliveryStatus: false,
        }),
      };

      mockRepository.findOne.mockResolvedValue(mockConfig);
      mockFactory.create.mockReturnValue(mockProvider);

      const result = await service.testProvider(
        'test-id',
        '+992929990259',
        'Test message'
      );

      expect(result.testResult.success).toBe(true);
      expect(mockProvider.sendSms).toHaveBeenCalledWith({
        phoneNumber: '+992929990259',
        message: 'Test message',
      });
    });

    it('should return failure when provider send fails', async () => {
      const mockProvider = {
        sendSms: jest.fn().mockResolvedValue({
          success: false,
          error: 'Connection timeout',
        }),
        isHealthy: jest.fn().mockResolvedValue(true),
        getName: jest.fn().mockReturnValue('imon_tj'),
        getCapabilities: jest.fn().mockReturnValue({
          maxMessageLength: 1600,
          supportsDeliveryStatus: false,
        }),
      };

      mockRepository.findOne.mockResolvedValue(mockConfig);
      mockFactory.create.mockReturnValue(mockProvider);

      const result = await service.testProvider(
        'test-id',
        '+992929990259',
        'Test message'
      );

      expect(result.testResult.success).toBe(false);
      expect(result.testResult.error).toContain('Connection timeout');
    });

    it('should throw BadRequestException when provider is not healthy', async () => {
      const mockProvider = {
        isHealthy: jest.fn().mockResolvedValue(false),
      };

      mockRepository.findOne.mockResolvedValue(mockConfig);
      mockFactory.create.mockReturnValue(mockProvider);

      await expect(
        service.testProvider('test-id', '+992929990259', 'Test')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when provider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.testProvider('invalid-id', '+992929990259', 'Test')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
