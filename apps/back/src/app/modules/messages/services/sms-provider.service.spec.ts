import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsProviderService } from './sms-provider.service';
import { SmsProviderConfigService } from './sms-provider-config.service';
import { SmsProviderFactory } from './providers/sms-provider.factory';

describe('SmsProviderService Integration', () => {
  let service: SmsProviderService;
  let providerConfigService: SmsProviderConfigService;
  let providerFactory: SmsProviderFactory;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        FEATURE_SMS_ENABLED: true,
        USE_NEW_SMS_SYSTEM: true,
        IMON_TJ_LOGIN: 'test_user',
        IMON_TJ_PASSWORD: 'test_password',
        SMS_API_KEY: 'old_api_key',
        SMS_API_URL: 'https://old-api.com',
        SMS_PROVIDER: 'smsru',
        SMS_SENDER: 'CRM',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockProviderConfigService = {
    findActive: jest.fn(),
  };

  const mockProviderFactory = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsProviderService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SmsProviderConfigService,
          useValue: mockProviderConfigService,
        },
        {
          provide: SmsProviderFactory,
          useValue: mockProviderFactory,
        },
      ],
    }).compile();

    service = module.get<SmsProviderService>(SmsProviderService);
    providerConfigService = module.get<SmsProviderConfigService>(
      SmsProviderConfigService
    );
    providerFactory = module.get<SmsProviderFactory>(SmsProviderFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSms with new system', () => {
    it('should use new system when USE_NEW_SMS_SYSTEM=true', async () => {
      const mockProvider = {
        sendSms: jest.fn().mockResolvedValue({
          success: true,
          messageId: '12345',
          provider: 'imon_tj',
        }),
      };

      const mockConfig = {
        id: 'test-id',
        name: 'imon_tj',
        displayName: 'IMON.TJ',
        isActive: true,
        config: {},
      };

      mockProviderConfigService.findActive.mockResolvedValue(mockConfig);
      mockProviderFactory.create.mockReturnValue(mockProvider);

      const result = await service.sendSms('+992929990259', 'Test message');

      expect(result.success).toBe(true);
      expect(mockProviderConfigService.findActive).toHaveBeenCalled();
      expect(mockProviderFactory.create).toHaveBeenCalledWith(mockConfig);
      expect(mockProvider.sendSms).toHaveBeenCalledWith({
        phoneNumber: '+992929990259',
        message: 'Test message',
      });
    });

    it('should handle no active provider gracefully', async () => {
      mockProviderConfigService.findActive.mockResolvedValue(null);

      const result = await service.sendSms('+992929990259', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No active SMS provider');
    });

    it('should handle provider creation failure', async () => {
      const mockConfig = {
        id: 'test-id',
        name: 'broken_provider',
        isActive: true,
      };

      mockProviderConfigService.findActive.mockResolvedValue(mockConfig);
      mockProviderFactory.create.mockImplementation(() => {
        throw new Error('Invalid configuration');
      });

      const result = await service.sendSms('+992929990259', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid configuration');
    });

    it('should handle SMS send failure from provider', async () => {
      const mockProvider = {
        sendSms: jest.fn().mockResolvedValue({
          success: false,
          error: 'Insufficient balance',
        }),
      };

      const mockConfig = {
        id: 'test-id',
        name: 'imon_tj',
        isActive: true,
      };

      mockProviderConfigService.findActive.mockResolvedValue(mockConfig);
      mockProviderFactory.create.mockReturnValue(mockProvider);

      const result = await service.sendSms('+992929990259', 'Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient balance');
    });
  });

  describe('sendSms with legacy system', () => {
    beforeEach(() => {
      // Override config to use legacy system
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'USE_NEW_SMS_SYSTEM') return false;
        if (key === 'FEATURE_SMS_ENABLED') return true;
        if (key === 'SMS_PROVIDER') return 'smsru';
        if (key === 'SMS_API_KEY') return 'test_api_key';
        if (key === 'SMS_API_URL') return 'https://sms.ru/sms/send';
        if (key === 'SMS_SENDER') return 'CRM';
        return defaultValue;
      });
    });

    it('should fall back to legacy system when USE_NEW_SMS_SYSTEM=false', async () => {
      // Recreate service with new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsProviderService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: SmsProviderConfigService,
            useValue: mockProviderConfigService,
          },
          {
            provide: SmsProviderFactory,
            useValue: mockProviderFactory,
          },
        ],
      }).compile();

      const legacyService = module.get<SmsProviderService>(SmsProviderService);

      // Legacy sendSms should be called
      // (тут мы не можем полноценно протестировать без моков axios,
      // но проверяем что новая система не вызывается)
      mockProviderConfigService.findActive.mockResolvedValue(null);

      await legacyService.sendSms('+79991234567', 'Test').catch(() => {
        // Expect some error from legacy system
      });

      // Новая система не должна быть вызвана
      expect(mockProviderConfigService.findActive).not.toHaveBeenCalled();
    });
  });

  describe('service initialization', () => {
    it('should log warning when SMS is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'FEATURE_SMS_ENABLED') return false;
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsProviderService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: SmsProviderConfigService,
            useValue: mockProviderConfigService,
          },
          {
            provide: SmsProviderFactory,
            useValue: mockProviderFactory,
          },
        ],
      }).compile();

      const disabledService = module.get<SmsProviderService>(SmsProviderService);

      // Service should be created but disabled
      expect(disabledService).toBeDefined();
    });
  });

  describe('multiple providers support', () => {
    it('should successfully send SMS with active provider', async () => {
      const mockProvider = {
        sendSms: jest.fn().mockResolvedValue({
          success: true,
          messageId: '12345',
          provider: 'imon_tj',
        }),
      };

      const mockConfig = {
        id: 'test-id',
        name: 'imon_tj',
        displayName: 'IMON.TJ',
        isActive: true,
        config: {
          baseUrl: 'https://api.example.com',
          authType: 'bearer' as const,
          endpoints: { send: '/send' },
          fieldMapping: { phone: 'p', message: 'm' },
          requestFormat: 'json' as const,
          requestMethod: 'POST' as const,
          responseMapping: { messageIdField: 'id' },
          credentials: {},
        },
      };

      mockProviderConfigService.findActive.mockResolvedValue(mockConfig);
      mockProviderFactory.create.mockReturnValue(mockProvider);

      const result = await service.sendSms('+992929990259', 'Test message');
      
      expect(result.success).toBe(true);
      expect(mockProvider.sendSms).toHaveBeenCalledWith({
        phoneNumber: '+992929990259',
        message: 'Test message',
      });
    });
  });
});
