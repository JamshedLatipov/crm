import { Assignment } from '../entities/assignment.entity';
import { NotificationType } from '../entities/notification.entity';

export const mapUser = (user: any) => {
  if (!user) return null;

  const fullName =
    user.firstName || user.lastName
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
      : user.username;

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName,
    email: user.email,
    avatar: user.avatar,
    roles: user.roles,
  };
};
// Helper: build a where-clause object for the specific entity FK column
export const buildEntityWhere = (
  entityType: string,
  entityId: string | number
) => {
  switch (entityType) {
    case 'task':
      return { taskId: Number(entityId) };
    case 'lead':
      return { leadId: Number(entityId) };
    case 'deal':
      return { dealId: String(entityId) };
    default:
      return {};
  }
};

// Helper: apply the appropriate FK column to a payload before create/save
export const applyEntityIdToPayload = (
  payload: any,
  entityType: string,
  entityId: string | number
) => {
  if (!payload) return;
  switch (entityType) {
    case 'task':
      payload.taskId = Number(entityId);
      break;
    case 'lead':
      payload.leadId = Number(entityId);
      break;
    case 'deal':
      payload.dealId = String(entityId);
      break;
    default:
      break;
  }
};

// Helper: extract a single stable entity id string from an Assignment instance
export const getEntityIdFromAssignment = (a: Assignment | any): string => {
  if (!a) return '';
  if (a.taskId !== undefined && a.taskId !== null) return String(a.taskId);
  if (a.leadId !== undefined && a.leadId !== null) return String(a.leadId);
  if (a.dealId !== undefined && a.dealId !== null) return String(a.dealId);
  // As a last resort, if entityType present and id stored in some other field
  if ((a as any).entityId) return String((a as any).entityId);
  return '';
};

export function mapNotificationType(entityType: string): NotificationType {
  switch (entityType) {
    case 'lead':
      return NotificationType.LEAD_ASSIGNED;
    case 'deal':
      return NotificationType.DEAL_ASSIGNED;
    case 'task':
      return NotificationType.TASK_ASSIGNED;
    default:
      return NotificationType.SYSTEM_REMINDER;
  }
}

// Build a default assignment payload for creating an Assignment entity
export function buildAssignmentPayload(
  entityType: string,
  entityId: string | number,
  userId: number,
  assignedBy: number | string,
  reason?: string
): Partial<Assignment> {
  const payload: any = {
    entityType,
    userId,
    assignedBy,
    reason,
    status: 'active',
    assignedAt: new Date()
  };

  applyEntityIdToPayload(payload, entityType, entityId);
  return payload as Partial<Assignment>;
}
