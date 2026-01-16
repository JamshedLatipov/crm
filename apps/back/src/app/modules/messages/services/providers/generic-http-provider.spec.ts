import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GenericHttpProvider } from './generic-http-provider';
import { SmsProviderConfig } from '../../entities/sms-provider-config.entity';
import { SendSmsParams } from './sms-provider.interface';
import axios from 'axios';

// Mock axios module
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GenericHttpProvider', () => {
  let provider: GenericHttpProvider;
  let configService: ConfigService;
  let mockConfig: SmsProviderConfig;
  let mockAxiosInstance: any;

  beforeEach(async () => {
    // Setup mock axios instance BEFORE creating provider
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    };

    // Mock axios.create to return mock instance
    mockedAxios.create = jest.fn(() => mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
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

    configService = module.get<ConfigService>(ConfigService);

    mockConfig = {
      id: 'test-id',
      name: 'imon_tj',
      displayName: 'IMON.TJ SMS Service',
      isActive: true,
      config: {
        baseUrl: 'https://sms-service.imon.tj',
        authType: 'custom',
        endpoints: {
          send: '/api/sms/send',
        },
        credentials: {
          loginEnv: 'IMON_TJ_LOGIN',
          passwordEnv: 'IMON_TJ_PASSWORD',
        },
        fieldMapping: {
          phone: 'telephone',
          message: 'sms',
          login: 'login',
          password: 'password',
        },
        requestFormat: 'json',
        requestMethod: 'POST',
        responseMapping: {
          messageIdField: 'smsID',
          successField: 'message',
          errorField: 'error',
        },
        customLogic: {
          md5Password: true,
          phoneFormat: '+992XXXXXXXXX',
        },
      },
      settings: {
        timeout: 10000,
        maxRetries: 3,
        costPerMessage: 0.05,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SmsProviderConfig;

    provider = new GenericHttpProvider(mockConfig, configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSms', () => {
    it('should successfully send SMS', async () => {
      const params: SendSmsParams = {
        phoneNumber: '+992929990259',
        message: 'Test message',
      };

      const mockResponse = {
        data: {
          smsID: '12345',
          message: 'SMS sent successfully',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await provider.sendSms(params);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('12345');
      expect(result.provider).toBe('imon_tj');
    });

    it('should handle API errors', async () => {
      const params: SendSmsParams = {
        phoneNumber: '+992929990259',
        message: 'Test',
      };

      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

      const result = await provider.sendSms(params);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = provider.getCapabilities();

      expect(capabilities.maxMessageLength).toBe(1000);
      expect(capabilities.supportsDeliveryStatus).toBe(false);
    });
  });

  describe('getName', () => {
    it('should return provider display name', () => {
      expect(provider.getName()).toBe('IMON.TJ SMS Service');
    });
  });

  describe('isHealthy', () => {
    it('should return true when config is valid', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });
      
      const isHealthy = await provider.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });
});
