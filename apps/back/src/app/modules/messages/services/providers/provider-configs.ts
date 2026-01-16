import { SmsProviderConfig } from '../../entities/sms-provider-config.entity';

/**
 * Предустановленные конфигурации для популярных SMS-провайдеров
 * Можно использовать как шаблоны для создания записей в БД
 * 
 * НЕ НУЖНО СОЗДАВАТЬ ОТДЕЛЬНЫЕ КЛАССЫ!
 * GenericHttpProvider поддерживает любые REST API
 */

/**
 * Конфигурация для IMON.TJ SMS Service (Таджикистан)
 * 
 * API: https://sms-service.imon.tj/api/sms/send
 * Требует: login, MD5(password), telephone, sms
 */
export const ImonTjConfig: Partial<SmsProviderConfig> = {
  name: 'imon_tj',
  displayName: 'IMON.TJ SMS Service',
  isActive: false,
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
  webhookConfig: {
    enabled: false,
  },
  settings: {
    timeout: 10000,
    maxRetries: 3,
    costPerMessage: 0.05,
  },
};

/**
 * Конфигурация для SMS.RU (Россия)
 * 
 * API: https://sms.ru/sms/send
 */
export const SmsRuConfig: Partial<SmsProviderConfig> = {
  name: 'sms_ru',
  displayName: 'SMS.RU',
  isActive: false,
  config: {
    baseUrl: 'https://sms.ru',
    authType: 'api_key',
    endpoints: {
      send: '/sms/send',
      balance: '/my/balance',
    },
    credentials: {
      apiKeyEnv: 'SMS_RU_API_KEY',
    },
    fieldMapping: {
      phone: 'to',
      message: 'msg',
      // API key передается в query
    },
    requestFormat: 'query',
    requestMethod: 'GET',
    responseMapping: {
      messageIdField: 'sms_id',
      successField: 'status_code',
      successValue: 100,
      errorField: 'status_text',
    },
  },
  settings: {
    timeout: 10000,
    maxRetries: 3,
    costPerMessage: 1.5,
  },
};

/**
 * Конфигурация для SMSC.RU (Россия)
 */
export const SmscRuConfig: Partial<SmsProviderConfig> = {
  name: 'smsc_ru',
  displayName: 'SMSC.RU',
  isActive: false,
  config: {
    baseUrl: 'https://smsc.ru',
    authType: 'basic',
    endpoints: {
      send: '/sys/send.php',
      balance: '/sys/balance.php',
    },
    credentials: {
      loginEnv: 'SMSC_LOGIN',
      passwordEnv: 'SMSC_PASSWORD',
    },
    fieldMapping: {
      phone: 'phones',
      message: 'mes',
      login: 'login',
      password: 'psw',
    },
    requestFormat: 'query',
    requestMethod: 'GET',
    responseMapping: {
      messageIdField: 'id',
      errorField: 'error',
    },
  },
  settings: {
    timeout: 10000,
    maxRetries: 3,
    costPerMessage: 1.2,
  },
};

/**
 * Конфигурация для Twilio (Международный)
 */
export const TwilioConfig: Partial<SmsProviderConfig> = {
  name: 'twilio',
  displayName: 'Twilio',
  isActive: false,
  config: {
    baseUrl: 'https://api.twilio.com/2010-04-01',
    authType: 'basic',
    endpoints: {
      send: '/Accounts/{accountSid}/Messages.json',
    },
    credentials: {
      loginEnv: 'TWILIO_ACCOUNT_SID',
      passwordEnv: 'TWILIO_AUTH_TOKEN',
    },
    fieldMapping: {
      phone: 'To',
      message: 'Body',
      sender: 'From',
    },
    requestFormat: 'form',
    requestMethod: 'POST',
    responseMapping: {
      messageIdField: 'sid',
      successField: 'status',
      errorField: 'message',
    },
  },
  settings: {
    timeout: 15000,
    maxRetries: 3,
    costPerMessage: 0.0075,
  },
};

/**
 * Пример: Произвольный REST API провайдер
 */
export const CustomProviderExample: Partial<SmsProviderConfig> = {
  name: 'custom_sms',
  displayName: 'Custom SMS Provider',
  isActive: false,
  config: {
    baseUrl: 'https://api.your-sms-service.com',
    authType: 'bearer',
    endpoints: {
      send: '/v1/messages',
    },
    credentials: {
      tokenEnv: 'CUSTOM_SMS_TOKEN',
    },
    fieldMapping: {
      phone: 'recipient',
      message: 'text',
    },
    requestFormat: 'json',
    requestMethod: 'POST',
    headers: {
      'X-API-Version': '1.0',
    },
    responseMapping: {
      messageIdField: 'data.message_id',
      successField: 'success',
      successValue: true,
      errorField: 'error.message',
    },
  },
  settings: {
    timeout: 10000,
    maxRetries: 2,
    costPerMessage: 0.1,
  },
};

