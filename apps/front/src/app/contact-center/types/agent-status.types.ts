/**
 * Agent status enum for Contact Center (Frontend)
 * Must match backend AgentStatusEnum
 */
export enum AgentStatusEnum {
  ONLINE = 'online',
  OFFLINE = 'offline',
  PAUSE = 'pause',
  BREAK = 'break',
  TRAINING = 'training',
  MEETING = 'meeting',
  WRAP_UP = 'wrap_up',
  DO_NOT_DISTURB = 'do_not_disturb',
  ON_CALL = 'on_call',
}

/**
 * Agent status labels (Russian)
 */
export const AGENT_STATUS_LABELS: Record<AgentStatusEnum, string> = {
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
 * Agent status icons (Material Icons)
 */
export const AGENT_STATUS_ICONS: Record<AgentStatusEnum, string> = {
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
 * Agent status colors (Tailwind-compatible)
 */
export const AGENT_STATUS_COLORS: Record<AgentStatusEnum, string> = {
  [AgentStatusEnum.ONLINE]: '#10b981', // green-500
  [AgentStatusEnum.OFFLINE]: '#6b7280', // gray-500
  [AgentStatusEnum.PAUSE]: '#f59e0b', // amber-500
  [AgentStatusEnum.BREAK]: '#3b82f6', // blue-500
  [AgentStatusEnum.TRAINING]: '#8b5cf6', // purple-500
  [AgentStatusEnum.MEETING]: '#ec4899', // pink-500
  [AgentStatusEnum.WRAP_UP]: '#14b8a6', // teal-500
  [AgentStatusEnum.DO_NOT_DISTURB]: '#ef4444', // red-500
  [AgentStatusEnum.ON_CALL]: '#10b981', // green-500 (active)
};

/**
 * Agent status interface
 * Matches backend AgentStatus entity
 */
export interface AgentStatus {
  id: number;
  userId: number | null;
  extension: string;
  fullName: string | null;
  status: AgentStatusEnum;
  previousStatus: AgentStatusEnum | null;
  reason: string | null;
  statusChangedAt: string; // ISO date string
  statusDurationSeconds: number;
  timeInStatusesToday: Record<string, number> | null;
  queueName: string | null;
  currentCallId: string | null;
  avgHandleTimeToday: number | null;
  callsToday: number;
  paused: boolean;
  lastActivityAt: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for setting agent status
 */
export interface SetAgentStatusDto {
  extension: string;
  status: AgentStatusEnum;
  userId?: number;
  fullName?: string;
  reason?: string;
  queueName?: string;
  currentCallId?: string;
}

/**
 * WebSocket event for agent status change
 */
export interface AgentStatusChangeEvent {
  type: 'agent:status_changed';
  payload: {
    extension: string;
    status: AgentStatusEnum;
    previousStatus?: AgentStatusEnum;
    reason?: string;
    fullName?: string;
    userId?: number;
  };
  timestamp: string;
}

/**
 * Helper to get status display info
 */
export function getAgentStatusInfo(status: AgentStatusEnum) {
  return {
    label: AGENT_STATUS_LABELS[status],
    icon: AGENT_STATUS_ICONS[status],
    color: AGENT_STATUS_COLORS[status],
  };
}

/**
 * Helper to check if agent is available for calls
 */
export function isAgentAvailable(agentStatus: AgentStatus): boolean {
  return agentStatus.status === AgentStatusEnum.ONLINE && !agentStatus.paused;
}

/**
 * Get all available statuses for dropdown
 */
export function getAllAgentStatuses(): Array<{
  value: AgentStatusEnum;
  label: string;
  icon: string;
  color: string;
}> {
  return Object.values(AgentStatusEnum).map((status) => ({
    value: status,
    label: AGENT_STATUS_LABELS[status],
    icon: AGENT_STATUS_ICONS[status],
    color: AGENT_STATUS_COLORS[status],
  }));
}
