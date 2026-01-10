// Queue names constants - separate file to avoid circular imports
export const QUEUE_NAMES = {
  SMS: 'crm_sms_queue',
  WHATSAPP: 'crm_whatsapp_queue',
  TELEGRAM: 'crm_telegram_queue',
  LEAD: 'crm_lead_queue',
  WEBHOOK: 'crm_webhook_queue',
  DLQ: 'crm_dead_letter_queue',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
