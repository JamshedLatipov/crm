/**
 * Microservices Configuration Constants
 * Centralized configuration for all service communication
 */

// Service names for identification
export const SERVICES = {
  IDENTITY: 'IDENTITY_SERVICE',
  LEAD: 'LEAD_SERVICE',
  DEAL: 'DEAL_SERVICE',
  CONTACT: 'CONTACT_SERVICE',
  TELEPHONY: 'TELEPHONY_SERVICE',
  NOTIFICATION: 'NOTIFICATION_SERVICE',
  TASK: 'TASK_SERVICE',
  ANALYTICS: 'ANALYTICS_SERVICE',
  AUDIT: 'AUDIT_SERVICE',
  CAMPAIGN: 'CAMPAIGN_SERVICE',
} as const;

// Shorthand exports for service names
export const IDENTITY_SERVICE = SERVICES.IDENTITY;
export const LEAD_SERVICE = SERVICES.LEAD;
export const DEAL_SERVICE = SERVICES.DEAL;
export const CONTACT_SERVICE = SERVICES.CONTACT;
export const TELEPHONY_SERVICE = SERVICES.TELEPHONY;
export const NOTIFICATION_SERVICE = SERVICES.NOTIFICATION;
export const TASK_SERVICE = SERVICES.TASK;
export const ANALYTICS_SERVICE = SERVICES.ANALYTICS;
export const AUDIT_SERVICE = SERVICES.AUDIT;
export const CAMPAIGN_SERVICE = SERVICES.CAMPAIGN;

// RabbitMQ Queue names
export const QUEUES = {
  // Service queues
  IDENTITY_QUEUE: 'crm_identity_queue',
  LEAD_QUEUE: 'crm_lead_queue',
  DEAL_QUEUE: 'crm_deal_queue',
  CONTACT_QUEUE: 'crm_contact_queue',
  TELEPHONY_QUEUE: 'crm_telephony_queue',
  NOTIFICATION_QUEUE: 'crm_notification_queue',
  TASK_QUEUE: 'crm_task_queue',
  ANALYTICS_QUEUE: 'crm_analytics_queue',
  AUDIT_QUEUE: 'crm_audit_queue',
  CAMPAIGN_QUEUE: 'crm_campaign_queue',
  
  // Event queues (pub/sub)
  EVENTS_EXCHANGE: 'crm_events',
  
  // Legacy queues (existing)
  SMS_QUEUE: 'crm_sms_queue',
  WEBHOOK_QUEUE: 'crm_webhook_queue',
  DEAD_LETTER_QUEUE: 'crm_dead_letter_queue',
} as const;

// Shorthand exports for queue names
export const IDENTITY_QUEUE = QUEUES.IDENTITY_QUEUE;
export const LEAD_QUEUE = QUEUES.LEAD_QUEUE;
export const DEAL_QUEUE = QUEUES.DEAL_QUEUE;
export const CONTACT_QUEUE = QUEUES.CONTACT_QUEUE;
export const TELEPHONY_QUEUE = QUEUES.TELEPHONY_QUEUE;
export const NOTIFICATION_QUEUE = QUEUES.NOTIFICATION_QUEUE;
export const TASK_QUEUE = QUEUES.TASK_QUEUE;
export const ANALYTICS_QUEUE = QUEUES.ANALYTICS_QUEUE;
export const AUDIT_QUEUE = QUEUES.AUDIT_QUEUE;
export const CAMPAIGN_QUEUE = QUEUES.CAMPAIGN_QUEUE;

// Default RabbitMQ configuration
export const RABBITMQ_CONFIG = {
  host: process.env['RABBITMQ_HOST'] || 'localhost',
  port: parseInt(process.env['RABBITMQ_PORT'] || '5672', 10),
  user: process.env['RABBITMQ_USER'] || 'guest',
  password: process.env['RABBITMQ_PASSWORD'] || 'guest',
  
  get url(): string {
    return `amqp://${this.user}:${this.password}@${this.host}:${this.port}`;
  },
} as const;

// JWT Configuration
export const JWT_CONFIG = {
  secret: process.env['JWT_SECRET'] || 'crm_jwt_secret_key_change_in_production',
  expiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
  serviceTokenExpiresIn: '1y', // Long-lived tokens for service-to-service
} as const;

// Service-to-service authentication
export const SERVICE_AUTH = {
  headerName: 'X-Service-Token',
  issuer: 'crm-gateway',
} as const;

// User roles (shared across services)
export enum UserRole {
  ADMIN = 'admin',
  SALES_MANAGER = 'sales_manager',
  SENIOR_MANAGER = 'senior_manager',
  TEAM_LEAD = 'team_lead',
  ACCOUNT_MANAGER = 'account_manager',
  CLIENT = 'client',
}

export type ServiceName = typeof SERVICES[keyof typeof SERVICES];
export type QueueName = typeof QUEUES[keyof typeof QUEUES];
