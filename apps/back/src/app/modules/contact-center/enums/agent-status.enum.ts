/**
 * Agent status enum for Contact Center
 * Defines all possible operator statuses in the system
 */
export enum AgentStatusEnum {
  /** Agent is online and available for calls */
  ONLINE = 'online',
  
  /** Agent is offline and not available */
  OFFLINE = 'offline',
  
  /** Agent is on pause (generic) */
  PAUSE = 'pause',
  
  /** Agent is on break (lunch, coffee, etc.) */
  BREAK = 'break',
  
  /** Agent is in training session */
  TRAINING = 'training',
  
  /** Agent is in a meeting */
  MEETING = 'meeting',
  
  /** Agent is completing post-call work (filling information) */
  WRAP_UP = 'wrap_up',
  
  /** Agent should not be disturbed */
  DO_NOT_DISTURB = 'do_not_disturb',
  
  /** Agent is currently on a call */
  ON_CALL = 'on_call',
}

/**
 * Helper to get user-friendly status labels (Russian)
 */
export const AgentStatusLabels: Record<AgentStatusEnum, string> = {
  [AgentStatusEnum.ONLINE]: 'Онлайн',
  [AgentStatusEnum.OFFLINE]: 'Оффлайн',
  [AgentStatusEnum.PAUSE]: 'Пауза',
  [AgentStatusEnum.BREAK]: 'Перерыв',
  [AgentStatusEnum.TRAINING]: 'Обучение',
  [AgentStatusEnum.MEETING]: 'Встреча',
  [AgentStatusEnum.WRAP_UP]: 'Завершение звонка',
  [AgentStatusEnum.DO_NOT_DISTURB]: 'Не беспокоить',
  [AgentStatusEnum.ON_CALL]: 'На звонке',
};

/**
 * Helper to determine if status allows receiving calls
 */
export function isAvailableForCalls(status: AgentStatusEnum): boolean {
  return status === AgentStatusEnum.ONLINE;
}

/**
 * Helper to get status icon
 */
export const AgentStatusIcons: Record<AgentStatusEnum, string> = {
  [AgentStatusEnum.ONLINE]: 'check_circle',
  [AgentStatusEnum.OFFLINE]: 'cancel',
  [AgentStatusEnum.PAUSE]: 'pause_circle',
  [AgentStatusEnum.BREAK]: 'free_breakfast',
  [AgentStatusEnum.TRAINING]: 'school',
  [AgentStatusEnum.MEETING]: 'groups',
  [AgentStatusEnum.WRAP_UP]: 'edit_note',
  [AgentStatusEnum.DO_NOT_DISTURB]: 'do_not_disturb',
  [AgentStatusEnum.ON_CALL]: 'phone_in_talk',
};

/**
 * Helper to get status color
 */
export const AgentStatusColors: Record<AgentStatusEnum, string> = {
  [AgentStatusEnum.ONLINE]: '#10b981', // green
  [AgentStatusEnum.OFFLINE]: '#6b7280', // gray
  [AgentStatusEnum.PAUSE]: '#f59e0b', // amber
  [AgentStatusEnum.BREAK]: '#3b82f6', // blue
  [AgentStatusEnum.TRAINING]: '#8b5cf6', // purple
  [AgentStatusEnum.MEETING]: '#ec4899', // pink
  [AgentStatusEnum.WRAP_UP]: '#14b8a6', // teal
  [AgentStatusEnum.DO_NOT_DISTURB]: '#ef4444', // red
  [AgentStatusEnum.ON_CALL]: '#10b981', // green (active)
};
