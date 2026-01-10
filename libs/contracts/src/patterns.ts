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
  BULK_DELETE_USERS: 'identity.user.bulkDelete',
  RESET_PASSWORD: 'identity.user.resetPassword',
  EXPORT_USERS: 'identity.user.export',
  
  // Manager operations
  GET_MANAGERS: 'identity.user.getManagers',
  GET_MANAGER: 'identity.user.getManager',
  GET_MANAGERS_STATS: 'identity.user.getManagersStats',
  GET_OPTIMAL_MANAGER: 'identity.user.getOptimalManager',
  UPDATE_WORKLOAD: 'identity.user.updateWorkload',
  UPDATE_LEAD_COUNT: 'identity.user.updateLeadCount',
  SEED_MANAGERS: 'identity.user.seedManagers',
  GET_TIMEZONES: 'identity.user.getTimezones',
  
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
  UPDATE_LAST_CONTACT: 'lead.updateLastContact',
  ADD_TAGS: 'lead.addTags',
  REMOVE_TAGS: 'lead.removeTags',
  SCHEDULE_FOLLOW_UP: 'lead.scheduleFollowUp',
  
  // Missing monolith endpoints
  GET_BY_MANAGER: 'lead.getByManager',
  GET_ACTIVITIES: 'lead.getActivities',
  GET_ASSIGNMENTS: 'lead.getAssignments',
  ADD_NOTE: 'lead.addNote',
  CONVERT_TO_DEAL: 'lead.convertToDeal',
  GET_HISTORY: 'lead.getHistory',
  GET_HISTORY_STATS: 'lead.getHistoryStats',
  AUTO_ASSIGN: 'lead.autoAssign',
  SET_PROMO_COMPANY: 'lead.setPromoCompany',
  REMOVE_PROMO_COMPANY: 'lead.removePromoCompany',
  GET_SOURCE_ANALYTICS: 'lead.getSourceAnalytics',
  
  // Lead Scoring
  SCORING_GET_RULES: 'lead.scoring.getRules',
  SCORING_GET_RULE: 'lead.scoring.getRule',
  SCORING_CREATE_RULE: 'lead.scoring.createRule',
  SCORING_UPDATE_RULE: 'lead.scoring.updateRule',
  SCORING_DELETE_RULE: 'lead.scoring.deleteRule',
  SCORING_TOGGLE_RULE: 'lead.scoring.toggleRule',
  SCORING_CALCULATE: 'lead.scoring.calculate',
  SCORING_BULK_CALCULATE: 'lead.scoring.bulkCalculate',
  SCORING_GET_SCORE: 'lead.scoring.getScore',
  SCORING_GET_HOT_LEADS: 'lead.scoring.getHotLeads',
  SCORING_GET_DEFAULT_RULES: 'lead.scoring.getDefaultRules',
  
  // Lead Distribution
  DISTRIBUTION_GET_RULES: 'lead.distribution.getRules',
  DISTRIBUTION_GET_RULE: 'lead.distribution.getRule',
  DISTRIBUTION_CREATE_RULE: 'lead.distribution.createRule',
  DISTRIBUTION_UPDATE_RULE: 'lead.distribution.updateRule',
  DISTRIBUTION_DELETE_RULE: 'lead.distribution.deleteRule',
  DISTRIBUTION_TOGGLE_RULE: 'lead.distribution.toggleRule',
  DISTRIBUTION_AUTO_ASSIGN: 'lead.distribution.autoAssign',
  DISTRIBUTION_GET_STATS: 'lead.distribution.getStats',
  DISTRIBUTION_REASSIGN: 'lead.distribution.reassign',
  DISTRIBUTION_GET_DEFAULT_RULES: 'lead.distribution.getDefaultRules',
  
  // Lead Capture
  CAPTURE_WEBSITE_FORM: 'lead.capture.websiteForm',
  CAPTURE_SOCIAL_MEDIA: 'lead.capture.socialMedia',
  CAPTURE_EMAIL_ACTIVITY: 'lead.capture.emailActivity',
  CAPTURE_COLD_CALL: 'lead.capture.coldCall',
  CAPTURE_WEBHOOK: 'lead.capture.webhook',
  CAPTURE_ZAPIER: 'lead.capture.zapier',
  CAPTURE_FACEBOOK: 'lead.capture.facebook',
  CAPTURE_GOOGLE_ADS: 'lead.capture.googleAds',
  CAPTURE_HUBSPOT: 'lead.capture.hubspot',
  CAPTURE_MAILCHIMP: 'lead.capture.mailchimp',
  CAPTURE_EMAIL: 'lead.capture.email',
  CAPTURE_GET_CONFIGS: 'lead.capture.getConfigs',
  CAPTURE_CREATE_CONFIG: 'lead.capture.createConfig',
  CAPTURE_UPDATE_CONFIG: 'lead.capture.updateConfig',
  CAPTURE_DELETE_CONFIG: 'lead.capture.deleteConfig',
  CAPTURE_GET_HISTORY: 'lead.capture.getHistory',
  CAPTURE_PROCESS: 'lead.capture.process',
  CAPTURE_GET_STATS: 'lead.capture.getStats',
  
  // Distribution additional patterns
  DISTRIBUTION_BULK_ASSIGN: 'lead.distribution.bulkAssign',
  DISTRIBUTION_GET_WORKLOAD: 'lead.distribution.getWorkload',
  
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
  
  // Search & Filter
  SEARCH: 'deal.search',
  GET_OVERDUE: 'deal.getOverdue',
  GET_BY_COMPANY: 'deal.getByCompany',
  GET_BY_CONTACT: 'deal.getByContact',
  GET_BY_LEAD: 'deal.getByLead',
  GET_BY_MANAGER: 'deal.getByManager',
  GET_ASSIGNMENTS: 'deal.getAssignments',
  
  // Pipeline
  MOVE_STAGE: 'deal.moveStage',
  GET_BY_STAGE: 'deal.getByStage',
  GET_STATS: 'deal.getStats',
  GET_FORECAST: 'deal.getForecast',
  GET_HISTORY: 'deal.getHistory',
  GET_HISTORY_STATS: 'deal.getHistoryStats',
  GET_STAGE_MOVEMENT_STATS: 'deal.getStageMovementStats',
  GET_MOST_ACTIVE: 'deal.getMostActive',
  GET_USER_ACTIVITY: 'deal.getUserActivity',
  
  // Actions
  WIN: 'deal.win',
  LOSE: 'deal.lose',
  REOPEN: 'deal.reopen',
  UPDATE_PROBABILITY: 'deal.updateProbability',
  
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
  
  // Company Search & Filter
  SEARCH_COMPANIES: 'contact.company.search',
  GET_COMPANY_STATS: 'contact.company.getStats',
  GET_COMPANY_DUPLICATES: 'contact.company.getDuplicates',
  GET_COMPANIES_INACTIVE: 'contact.company.getInactive',
  GET_COMPANIES_BY_INN: 'contact.company.getByInn',
  GET_COMPANIES_BY_INDUSTRY: 'contact.company.getByIndustry',
  GET_COMPANIES_BY_SIZE: 'contact.company.getBySize',
  
  // Company Actions
  BLACKLIST_COMPANY: 'contact.company.blacklist',
  UNBLACKLIST_COMPANY: 'contact.company.unblacklist',
  ASSIGN_COMPANY: 'contact.company.assign',
  TOUCH_COMPANY: 'contact.company.touch',
  UPDATE_COMPANY_RATING: 'contact.company.updateRating',
  ADD_COMPANY_TAGS: 'contact.company.addTags',
  REMOVE_COMPANY_TAGS: 'contact.company.removeTags',
  
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
  TRANSFER_CALL: 'telephony.call.transfer',
  GET_CALL_TRACE: 'telephony.call.trace',
  
  // CDR
  CDR_GET_ALL: 'telephony.cdr.getAll',
  CDR_GET_BY_SRC: 'telephony.cdr.getBySrc',
  CDR_GET_BY_DST: 'telephony.cdr.getByDst',
  CDR_GET_BY_DISPOSITION: 'telephony.cdr.getByDisposition',
  CDR_GET_BY_UNIQUEID: 'telephony.cdr.getByUniqueid',
  CDR_GET_CHANNEL_UNIQUEID: 'telephony.cdr.getChannelUniqueid',
  CDR_CREATE_LOG: 'telephony.cdr.createLog',
  CDR_GET_LOGS: 'telephony.cdr.getLogs',
  CDR_GET_LOG: 'telephony.cdr.getLog',
  
  // Call Analytics
  ANALYTICS_SUMMARY: 'telephony.analytics.summary',
  ANALYTICS_QUEUE_PERFORMANCE: 'telephony.analytics.queuePerformance',
  ANALYTICS_AGENT_PERFORMANCE: 'telephony.analytics.agentPerformance',
  ANALYTICS_SLA_VIOLATIONS: 'telephony.analytics.slaViolations',
  ANALYTICS_ABANDONED: 'telephony.analytics.abandoned',
  ANALYTICS_ADD_TAG: 'telephony.analytics.addTag',
  ANALYTICS_UPDATE_RECORDING: 'telephony.analytics.updateRecording',
  
  // Queues
  GET_QUEUE: 'telephony.queue.get',
  GET_QUEUES: 'telephony.queue.getAll',
  CREATE_QUEUE: 'telephony.queue.create',
  UPDATE_QUEUE: 'telephony.queue.update',
  DELETE_QUEUE: 'telephony.queue.delete',
  ADD_TO_QUEUE: 'telephony.queue.addMember',
  REMOVE_FROM_QUEUE: 'telephony.queue.removeMember',
  PAUSE_MEMBER: 'telephony.queue.pauseMember',
  
  // Queue Members
  GET_QUEUE_MEMBERS: 'telephony.queue.getMembers',
  GET_QUEUE_MEMBER: 'telephony.queue.getMember',
  GET_MY_QUEUE_STATE: 'telephony.queue.getMyState',
  UPDATE_QUEUE_MEMBER: 'telephony.queue.updateMember',
  
  // SIP Endpoints (ps-endpoints)
  ENDPOINT_GET_ALL: 'telephony.endpoint.getAll',
  ENDPOINT_GET_FREE: 'telephony.endpoint.getFree',
  ENDPOINT_GET: 'telephony.endpoint.get',
  ENDPOINT_CREATE: 'telephony.endpoint.create',
  ENDPOINT_UPDATE: 'telephony.endpoint.update',
  ENDPOINT_DELETE: 'telephony.endpoint.delete',
  
  // SIP AORs (ps-aors)
  AOR_GET_ALL: 'telephony.aor.getAll',
  AOR_GET: 'telephony.aor.get',
  AOR_CREATE: 'telephony.aor.create',
  AOR_UPDATE: 'telephony.aor.update',
  AOR_DELETE: 'telephony.aor.delete',
  
  // SIP Auth (ps-auths)
  AUTH_GET_ALL: 'telephony.auth.getAll',
  AUTH_GET: 'telephony.auth.get',
  AUTH_CREATE: 'telephony.auth.create',
  AUTH_UPDATE: 'telephony.auth.update',
  AUTH_DELETE: 'telephony.auth.delete',
  
  // AMI
  AMI_STATUS: 'telephony.ami.status',
  AMI_ACTION: 'telephony.ami.action',
  AMI_ORIGINATE: 'telephony.ami.originate',
  AMI_HANGUP: 'telephony.ami.hangup',
  AMI_REDIRECT: 'telephony.ami.redirect',
  AMI_QUEUE_STATUS: 'telephony.ami.queueStatus',
  AMI_PEER_STATUS: 'telephony.ami.peerStatus',
  
  // ARI
  ARI_STATUS: 'telephony.ari.status',
  ARI_GET_CHANNELS: 'telephony.ari.getChannels',
  ARI_GET_BRIDGES: 'telephony.ari.getBridges',
  ARI_GET_ENDPOINTS: 'telephony.ari.getEndpoints',
  ARI_ANSWER_CHANNEL: 'telephony.ari.answerChannel',
  ARI_HANGUP_CHANNEL: 'telephony.ari.hangupChannel',
  ARI_PLAY_MEDIA: 'telephony.ari.playMedia',
  ARI_CREATE_BRIDGE: 'telephony.ari.createBridge',
  ARI_ADD_TO_BRIDGE: 'telephony.ari.addToBridge',
  
  // IVR
  IVR_GET_TREE: 'telephony.ivr.getTree',
  IVR_GET_ROOTS: 'telephony.ivr.getRoots',
  IVR_GET_NODE: 'telephony.ivr.getNode',
  IVR_GET_CHILDREN: 'telephony.ivr.getChildren',
  IVR_GET_SUBTREE: 'telephony.ivr.getSubtree',
  IVR_CREATE_NODE: 'telephony.ivr.createNode',
  IVR_UPDATE_NODE: 'telephony.ivr.updateNode',
  IVR_DELETE_NODE: 'telephony.ivr.deleteNode',
  IVR_REORDER_NODE: 'telephony.ivr.reorderNode',
  IVR_MOVE_NODE: 'telephony.ivr.moveNode',
  IVR_DUPLICATE_NODE: 'telephony.ivr.duplicateNode',
  
  // Recordings
  RECORDING_LIST: 'telephony.recording.list',
  RECORDING_GET_INFO: 'telephony.recording.getInfo',
  RECORDING_EXISTS: 'telephony.recording.exists',
  
  // Call Scripts
  SCRIPT_GET_ALL: 'telephony.script.getAll',
  SCRIPT_GET_TREES: 'telephony.script.getTrees',
  SCRIPT_GET_ONE: 'telephony.script.getOne',
  SCRIPT_CREATE: 'telephony.script.create',
  SCRIPT_UPDATE: 'telephony.script.update',
  SCRIPT_DELETE: 'telephony.script.delete',
  SCRIPT_TOGGLE: 'telephony.script.toggle',
  SCRIPT_SEARCH: 'telephony.script.search',
  SCRIPT_REORDER: 'telephony.script.reorder',
  SCRIPT_CATEGORY_GET_ALL: 'telephony.script.category.getAll',
  SCRIPT_CATEGORY_GET_ONE: 'telephony.script.category.getOne',
  SCRIPT_CATEGORY_CREATE: 'telephony.script.category.create',
  SCRIPT_CATEGORY_UPDATE: 'telephony.script.category.update',
  SCRIPT_CATEGORY_DELETE: 'telephony.script.category.delete',
  
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
  GET_NOTIFICATION: 'notification.get',
  MARK_ALL_READ: 'notification.markAllRead',
  DELETE: 'notification.delete',
  
  // Missing monolith endpoints
  GET_PENDING: 'notification.getPending',
  GET_SCHEDULED: 'notification.getScheduled',
  GET_FAILED: 'notification.getFailed',
  SEND_LEAD_NOTIFICATION: 'notification.sendLead',
  SEND_DEAL_NOTIFICATION: 'notification.sendDeal',
  SEND_SYSTEM_NOTIFICATION: 'notification.sendSystem',
  MARK_SENT: 'notification.markSent',
  DELETE_ALL: 'notification.deleteAll',
  MARK_DELIVERED: 'notification.markDelivered',
  MARK_FAILED: 'notification.markFailed',
  DELETE_EXPIRED: 'notification.deleteExpired',
  
  // Notification Rules
  RULES_GET_ALL: 'notification.rules.getAll',
  RULES_GET_ACTIVE: 'notification.rules.getActive',
  RULES_GET_BY_TYPE: 'notification.rules.getByType',
  RULES_GET_ONE: 'notification.rules.getOne',
  RULES_CREATE: 'notification.rules.create',
  RULES_CREATE_DEFAULT: 'notification.rules.createDefault',
  RULES_UPDATE: 'notification.rules.update',
  RULES_DELETE: 'notification.rules.delete',
  RULES_TOGGLE: 'notification.rules.toggle',
  RULES_EVALUATE: 'notification.rules.evaluate',
  RULES_DUPLICATE: 'notification.rules.duplicate',
  RULES_REORDER: 'notification.rules.reorder',
  RULES_GET_BY_TRIGGER: 'notification.rules.getByTrigger',
  RULES_BULK_TOGGLE: 'notification.rules.bulkToggle',
  RULES_GET_STATS: 'notification.rules.getStats',
  RULES_GET_DEFAULTS: 'notification.rules.getDefaults',
  
  // SMS
  SMS_SEND: 'notification.sms.send',
  SMS_SEND_BULK: 'notification.sms.sendBulk',
  SMS_GET_MESSAGES: 'notification.sms.getMessages',
  SMS_GET_MESSAGE: 'notification.sms.getMessage',
  SMS_GET_STATS: 'notification.sms.getStats',
  SMS_GET_TEMPLATES: 'notification.sms.getTemplates',
  SMS_GET_TEMPLATE: 'notification.sms.getTemplate',
  SMS_CREATE_TEMPLATE: 'notification.sms.createTemplate',
  SMS_UPDATE_TEMPLATE: 'notification.sms.updateTemplate',
  SMS_DELETE_TEMPLATE: 'notification.sms.deleteTemplate',
  SMS_TOGGLE_TEMPLATE: 'notification.sms.toggleTemplate',
  SMS_PREVIEW_TEMPLATE: 'notification.sms.previewTemplate',
  
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
  
  // Queries
  GET_STATS: 'task.getStats',
  GET_TYPES: 'task.getTypes',
  GET_OVERDUE: 'task.getOverdue',
  GET_BY_ASSIGNEE: 'task.getByAssignee',
  
  // Missing monolith endpoints
  ADD_COMMENT: 'task.addComment',
  GET_COMMENTS: 'task.getComments',
  GET_HISTORY: 'task.getHistory',
  
  // Task Types
  TYPE_GET_ALL: 'task.type.getAll',
  TYPE_GET_ONE: 'task.type.getOne',
  TYPE_CREATE: 'task.type.create',
  TYPE_UPDATE: 'task.type.update',
  TYPE_DELETE: 'task.type.delete',
  TYPE_FORCE_DELETE: 'task.type.forceDelete',
  TYPE_REORDER: 'task.type.reorder',
  TYPE_CALCULATE_DUE: 'task.type.calculateDueDate',
  TYPE_VALIDATE_TIMEFRAME: 'task.type.validateTimeframe',
  TYPE_GET_ACTIVE: 'task.type.getActive',
  TYPE_TOGGLE: 'task.type.toggle',
  
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
  GET_MANAGER_DASHBOARD: 'analytics.dashboard.manager',
  
  // Call-specific Analytics (from monolith)
  CALLS_AGENT_PERFORMANCE: 'analytics.calls.agentPerformance',
  CALLS_OVERVIEW: 'analytics.calls.overview',
  CALLS_SLA: 'analytics.calls.sla',
  CALLS_ABANDONED: 'analytics.calls.abandoned',
  CALLS_QUEUE_PERFORMANCE: 'analytics.calls.queuePerformance',
  CALLS_IVR_ANALYSIS: 'analytics.calls.ivrAnalysis',
  CALLS_CONVERSION: 'analytics.calls.conversion',
  
  // Reports
  GENERATE_REPORT: 'analytics.report.generate',
  GET_SALES_REPORT: 'analytics.report.sales',
  GET_LEADS_REPORT: 'analytics.report.leads',
  GET_CALLS_REPORT: 'analytics.report.calls',
  GET_PERFORMANCE_REPORT: 'analytics.report.performance',
  EXPORT_REPORT: 'analytics.report.export',
  
  // Forecasting
  FORECAST_GET_ALL: 'analytics.forecast.getAll',
  FORECAST_GET_ONE: 'analytics.forecast.getOne',
  FORECAST_CREATE: 'analytics.forecast.create',
  FORECAST_UPDATE: 'analytics.forecast.update',
  FORECAST_DELETE: 'analytics.forecast.delete',
  FORECAST_CALCULATE: 'analytics.forecast.calculate',
  FORECAST_ACTIVATE: 'analytics.forecast.activate',
  FORECAST_COMPLETE: 'analytics.forecast.complete',
  FORECAST_ARCHIVE: 'analytics.forecast.archive',
  FORECAST_DUPLICATE: 'analytics.forecast.duplicate',
  FORECAST_GET_PERIODS: 'analytics.forecast.getPeriods',
  FORECAST_UPDATE_PERIOD: 'analytics.forecast.updatePeriod',
  FORECAST_GET_STATS: 'analytics.forecast.getStats',
  
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
  
  // Segments
  SEGMENT_GET_ALL: 'campaign.segment.getAll',
  SEGMENT_GET_ONE: 'campaign.segment.getOne',
  SEGMENT_CREATE: 'campaign.segment.create',
  SEGMENT_UPDATE: 'campaign.segment.update',
  SEGMENT_DELETE: 'campaign.segment.delete',
  SEGMENT_GET_CONTACTS: 'campaign.segment.getContacts',
  SEGMENT_RECALCULATE: 'campaign.segment.recalculate',
  
  // Templates
  TEMPLATE_GET_ALL: 'campaign.template.getAll',
  TEMPLATE_GET_ONE: 'campaign.template.getOne',
  TEMPLATE_CREATE: 'campaign.template.create',
  TEMPLATE_UPDATE: 'campaign.template.update',
  TEMPLATE_DELETE: 'campaign.template.delete',
  TEMPLATE_PREVIEW: 'campaign.template.preview',
  TEMPLATE_DUPLICATE: 'campaign.template.duplicate',
  
  // Health
  HEALTH_CHECK: 'campaign.health',
} as const;

// Comment Service Patterns
export const COMMENT_PATTERNS = {
  // CRUD
  CREATE: 'comment.create',
  GET_ALL: 'comment.getAll',
  GET_ONE: 'comment.getOne',
  UPDATE: 'comment.update',
  DELETE: 'comment.delete',
  
  // Entity Comments
  GET_FOR_ENTITY: 'comment.getForEntity',
  GET_COUNT_FOR_ENTITY: 'comment.getCountForEntity',
  
  // User Comments
  GET_BY_USER: 'comment.getByUser',
  GET_RECENT: 'comment.getRecent',
  
  // Mentions
  GET_MENTIONS: 'comment.getMentions',
  
  // Replies
  REPLY: 'comment.reply',
  
  // Pin
  PIN: 'comment.pin',
  
  // Attachments
  ADD_ATTACHMENT: 'comment.addAttachment',
  REMOVE_ATTACHMENT: 'comment.removeAttachment',
  
  // Search
  SEARCH: 'comment.search',
  
  // Stats
  GET_STATS: 'comment.getStats',
  
  // Health
  HEALTH_CHECK: 'comment.health',
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
export type CommentPattern = typeof COMMENT_PATTERNS[keyof typeof COMMENT_PATTERNS];
export type CampaignPattern = typeof CAMPAIGN_PATTERNS[keyof typeof CAMPAIGN_PATTERNS];
