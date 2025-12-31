/**
 * Message Patterns for RabbitMQ RPC communication
 * These patterns are used with @MessagePattern decorator in NestJS microservices
 */

// Identity Service Patterns
export const IDENTITY_PATTERNS = {
  // Auth
  VALIDATE_USER: 'identity.auth.validate',
  LOGIN: 'identity.auth.login',
  LOGOUT: 'identity.auth.logout',
  REGISTER: 'identity.auth.register',
  REFRESH_TOKEN: 'identity.auth.refresh',
  VALIDATE_TOKEN: 'identity.auth.validateToken',
  
  // User CRUD
  GET_USER: 'identity.user.get',
  GET_USERS: 'identity.user.getAll',
  GET_USER_BY_USERNAME: 'identity.user.getByUsername',
  CREATE_USER: 'identity.user.create',
  UPDATE_USER: 'identity.user.update',
  DELETE_USER: 'identity.user.delete',
  
  // Manager operations
  GET_MANAGERS: 'identity.user.getManagers',
  GET_OPTIMAL_MANAGER: 'identity.user.getOptimalManager',
  UPDATE_WORKLOAD: 'identity.user.updateWorkload',
  
  // Health
  HEALTH_CHECK: 'identity.health',
} as const;

// Lead Service Patterns
export const LEAD_PATTERNS = {
  // CRUD
  GET_LEAD: 'lead.get',
  GET_LEADS: 'lead.getAll',
  CREATE_LEAD: 'lead.create',
  UPDATE_LEAD: 'lead.update',
  DELETE_LEAD: 'lead.delete',
  
  // Search & Filter
  SEARCH: 'lead.search',
  GET_STATS: 'lead.stats',
  GET_HIGH_VALUE: 'lead.highValue',
  GET_STALE: 'lead.stale',
  
  // Actions
  ASSIGN_LEAD: 'lead.assign',
  BULK_ASSIGN: 'lead.bulkAssign',
  CONVERT_LEAD: 'lead.convert',
  SCORE_LEAD: 'lead.score',
  CHANGE_STATUS: 'lead.changeStatus',
  QUALIFY: 'lead.qualify',
  CAPTURE_LEAD: 'lead.capture',
  
  // Health
  HEALTH_CHECK: 'lead.health',
} as const;

// Deal Service Patterns
export const DEAL_PATTERNS = {
  // CRUD
  FIND_ALL: 'deal.findAll',
  FIND_ONE: 'deal.findOne',
  CREATE: 'deal.create',
  UPDATE: 'deal.update',
  REMOVE: 'deal.remove',
  
  // Pipeline
  MOVE_STAGE: 'deal.moveStage',
  GET_BY_STAGE: 'deal.getByStage',
  GET_STATS: 'deal.getStats',
  GET_FORECAST: 'deal.getForecast',
  GET_HISTORY: 'deal.getHistory',
  
  // Actions
  WIN: 'deal.win',
  LOSE: 'deal.lose',
  REOPEN: 'deal.reopen',
  
  // Links
  LINK_CONTACT: 'deal.linkContact',
  LINK_COMPANY: 'deal.linkCompany',
  LINK_LEAD: 'deal.linkLead',
  
  // Health
  HEALTH: 'deal.health',
} as const;

// Pipeline Service Patterns
export const PIPELINE_PATTERNS = {
  FIND_ALL_STAGES: 'pipeline.stages.findAll',
  FIND_ONE_STAGE: 'pipeline.stages.findOne',
  CREATE_STAGE: 'pipeline.stages.create',
  UPDATE_STAGE: 'pipeline.stages.update',
  REMOVE_STAGE: 'pipeline.stages.remove',
  REORDER_STAGES: 'pipeline.stages.reorder',
} as const;

// Contact Service Patterns
export const CONTACT_PATTERNS = {
  // Contact CRUD
  GET_CONTACT: 'contact.get',
  GET_CONTACTS: 'contact.getAll',
  CREATE_CONTACT: 'contact.create',
  UPDATE_CONTACT: 'contact.update',
  DELETE_CONTACT: 'contact.delete',
  
  // Contact Search & Filter
  SEARCH_CONTACTS: 'contact.search',
  GET_BY_PHONE: 'contact.getByPhone',
  GET_BY_MANAGER: 'contact.getByManager',
  GET_RECENT: 'contact.getRecent',
  GET_INACTIVE: 'contact.getInactive',
  GET_DUPLICATES: 'contact.getDuplicates',
  GET_STATS: 'contact.getStats',
  
  // Contact Actions
  BLACKLIST: 'contact.blacklist',
  UNBLACKLIST: 'contact.unblacklist',
  ASSIGN: 'contact.assign',
  TOUCH: 'contact.touch',
  
  // Activity
  GET_ACTIVITY: 'contact.activity.get',
  ADD_ACTIVITY: 'contact.activity.add',
  
  // Company CRUD
  GET_COMPANY: 'contact.company.get',
  GET_COMPANIES: 'contact.company.getAll',
  CREATE_COMPANY: 'contact.company.create',
  UPDATE_COMPANY: 'contact.company.update',
  DELETE_COMPANY: 'contact.company.delete',
  
  // Health
  HEALTH_CHECK: 'contact.health',
} as const;

// Telephony Service Patterns
export const TELEPHONY_PATTERNS = {
  // Calls
  GET_CALL_LOG: 'telephony.call.get',
  GET_CALL_LOGS: 'telephony.call.getAll',
  ORIGINATE_CALL: 'telephony.call.originate',
  HANGUP_CALL: 'telephony.call.hangup',
  
  // Queues
  GET_QUEUE: 'telephony.queue.get',
  GET_QUEUES: 'telephony.queue.getAll',
  ADD_TO_QUEUE: 'telephony.queue.addMember',
  REMOVE_FROM_QUEUE: 'telephony.queue.removeMember',
  PAUSE_MEMBER: 'telephony.queue.pauseMember',
  
  // IVR
  GET_IVR: 'telephony.ivr.get',
  GET_IVRS: 'telephony.ivr.getAll',
  
  // Recordings
  GET_RECORDING: 'telephony.recording.get',
  
  // Health
  HEALTH_CHECK: 'telephony.health',
} as const;

// Notification Service Patterns
export const NOTIFICATION_PATTERNS = {
  SEND: 'notification.send',
  SEND_BULK: 'notification.sendBulk',
  MARK_READ: 'notification.markRead',
  GET_NOTIFICATIONS: 'notification.getAll',
  GET_UNREAD_COUNT: 'notification.unreadCount',
  
  // Health
  HEALTH_CHECK: 'notification.health',
} as const;

// Task Service Patterns
export const TASK_PATTERNS = {
  // CRUD
  GET_TASK: 'task.get',
  GET_TASKS: 'task.getAll',
  CREATE_TASK: 'task.create',
  UPDATE_TASK: 'task.update',
  DELETE_TASK: 'task.delete',
  
  // Actions
  COMPLETE_TASK: 'task.complete',
  ASSIGN_TASK: 'task.assign',
  
  // Health
  HEALTH_CHECK: 'task.health',
} as const;

// Analytics Service Patterns
export const ANALYTICS_PATTERNS = {
  GET_CALL_ANALYTICS: 'analytics.calls',
  GET_LEAD_ANALYTICS: 'analytics.leads',
  GET_DEAL_ANALYTICS: 'analytics.deals',
  GET_USER_PERFORMANCE: 'analytics.userPerformance',
  GET_DASHBOARD: 'analytics.dashboard',
  
  // Health
  HEALTH_CHECK: 'analytics.health',
} as const;

// Audit Service Patterns
export const AUDIT_PATTERNS = {
  // Core logging
  LOG: 'audit.log',
  
  // Query operations
  FIND_ALL: 'audit.findAll',
  FIND_ONE: 'audit.findOne',
  FIND_BY_ENTITY: 'audit.findByEntity',
  FIND_BY_USER: 'audit.findByUser',
  
  // Analysis
  GET_STATS: 'audit.getStats',
  GET_TIMELINE: 'audit.getTimeline',
  SEARCH: 'audit.search',
  
  // Security
  GET_SECURITY_EVENTS: 'audit.getSecurityEvents',
  GET_ERRORS: 'audit.getErrors',
  
  // Health
  HEALTH_CHECK: 'audit.health',
} as const;

// Campaign Service Patterns
export const CAMPAIGN_PATTERNS = {
  // Campaigns CRUD
  GET_CAMPAIGN: 'campaign.get',
  GET_CAMPAIGNS: 'campaign.getAll',
  CREATE_CAMPAIGN: 'campaign.create',
  UPDATE_CAMPAIGN: 'campaign.update',
  DELETE_CAMPAIGN: 'campaign.delete',
  
  // Campaign actions
  START_CAMPAIGN: 'campaign.start',
  PAUSE_CAMPAIGN: 'campaign.pause',
  STOP_CAMPAIGN: 'campaign.stop',
  GET_STATS: 'campaign.getStats',
  
  // Health
  HEALTH_CHECK: 'campaign.health',
} as const;

export type IdentityPattern = typeof IDENTITY_PATTERNS[keyof typeof IDENTITY_PATTERNS];
export type LeadPattern = typeof LEAD_PATTERNS[keyof typeof LEAD_PATTERNS];
export type DealPattern = typeof DEAL_PATTERNS[keyof typeof DEAL_PATTERNS];
export type ContactPattern = typeof CONTACT_PATTERNS[keyof typeof CONTACT_PATTERNS];
export type TelephonyPattern = typeof TELEPHONY_PATTERNS[keyof typeof TELEPHONY_PATTERNS];
export type NotificationPattern = typeof NOTIFICATION_PATTERNS[keyof typeof NOTIFICATION_PATTERNS];
export type TaskPattern = typeof TASK_PATTERNS[keyof typeof TASK_PATTERNS];
export type AnalyticsPattern = typeof ANALYTICS_PATTERNS[keyof typeof ANALYTICS_PATTERNS];
export type AuditPattern = typeof AUDIT_PATTERNS[keyof typeof AUDIT_PATTERNS];
export type CampaignPattern = typeof CAMPAIGN_PATTERNS[keyof typeof CAMPAIGN_PATTERNS];
