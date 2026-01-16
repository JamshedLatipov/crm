import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsProviderFactory } from './sms-provider.factory';
import { GenericHttpProvider } from './generic-http-provider';
import { SmsProviderConfig } from '../../entities/sms-provider-config.entity';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SmsProviderFactory', () => {
  let factory: SmsProviderFactory;
  let configService: ConfigService;

  beforeEach(async () => {
    // Mock axios.create
    const mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    };
    mockedAxios.create = jest.fn(() => mockAxiosInstance as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsProviderFactory,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                IMON_TJ_LOGIN: 'test_user',
                IMON_TJ_PASSWORD: 'test_password',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    factory = module.get<SmsProviderFactory>(SmsProviderFactory);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create GenericHttpProvider', () => {
      const config: SmsProviderConfig = {
        id: 'test-id',
        name: 'imon_tj',
        displayName: 'IMON.TJ',
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

      const provider = factory.create(config);

      expect(provider).toBeInstanceOf(GenericHttpProvider);
    });
  });

  describe('validateConfig', () => {
    it('should return valid for correct config', () => {
      const config: Partial<SmsProviderConfig> = {
        name: 'test',
        displayName: 'Test',
        config: {
          baseUrl: 'https://api.example.com',
          authType: 'bearer',
          endpoints: { send: '/send' },
          credentials: {},
          fieldMapping: {
            phone: 'phone',
            message: 'text',
          },
          requestFormat: 'json',
          requestMethod: 'POST',
          responseMapping: {
            messageIdField: 'id',
          },
        },
      };

      const result = factory.validateConfig(config as SmsProviderConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for invalid config', () => {
      const config: any = {
        name: 'test',
        config: {
          authType: 'bearer',
          // missing baseUrl
          endpoints: { send: '/send' },
          credentials: {},
          fieldMapping: { phone: 'p', message: 'm' },
          requestFormat: 'json',
          requestMethod: 'POST',
          responseMapping: { messageIdField: 'id' },
        },
      };

      const result = factory.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
