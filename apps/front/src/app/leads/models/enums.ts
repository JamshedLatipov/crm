export enum ActivityType {
  EMAIL_SENT = 'email_sent',
  EMAIL_OPENED = 'email_opened',
  EMAIL_CLICKED = 'email_clicked',
  PHONE_CALL_MADE = 'phone_call_made',
  PHONE_CALL_RECEIVED = 'phone_call_received',
  MEETING_SCHEDULED = 'meeting_scheduled',
  MEETING_HELD = 'meeting_held',
  PROPOSAL_SENT = 'proposal_sent',
  PROPOSAL_VIEWED = 'proposal_viewed',
  WEBSITE_VISIT = 'website_visit',
  FORM_SUBMITTED = 'form_submitted',
  DOCUMENT_DOWNLOADED = 'document_downloaded',
  DEMO_REQUESTED = 'demo_requested',
  WEBINAR_ATTENDED = 'webinar_attended',
  STATUS_CHANGED = 'status_changed',
  SCORE_UPDATED = 'score_updated',
  ASSIGNED = 'assigned',
  NOTE_ADDED = 'note_added',
  TASK_CREATED = 'task_created',
  TASK_COMPLETED = 'task_completed'
}

export enum DistributionMethod {
  ROUND_ROBIN = 'round_robin',
  LOAD_BASED = 'load_based',
  SKILL_BASED = 'skill_based',
  GEOGRAPHIC = 'geographic',
  RANDOM = 'random',
  MANUAL = 'manual'
}

export enum ScoringRuleType {
  EMAIL_OPENED = 'email_opened',
  EMAIL_CLICKED = 'email_clicked',
  WEBSITE_VISIT = 'website_visit',
  FORM_SUBMITTED = 'form_submitted',
  DOWNLOAD = 'download',
  WEBINAR_ATTENDED = 'webinar_attended',
  DEMO_REQUESTED = 'demo_requested',
  PHONE_CALL = 'phone_call',
  MEETING_SCHEDULED = 'meeting_scheduled',
  PROPOSAL_VIEWED = 'proposal_viewed',
  PRICE_PAGE_VIEWED = 'price_page_viewed',
  CONTACT_INFO_PROVIDED = 'contact_info_provided',
  COMPANY_SIZE = 'company_size',
  INDUSTRY_MATCH = 'industry_match',
  BUDGET_INDICATED = 'budget_indicated',
  DECISION_MAKER = 'decision_maker'
}
