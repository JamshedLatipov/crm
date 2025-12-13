import { NotificationType } from '../entities/notification.entity';
import { Lead } from '../../leads/lead.entity';
import { Deal } from '../../deals/deal.entity';
import { Task } from '../../tasks/task.entity';

type Manager = any;

export function getEntityHandler(entityType: string) {
  const base: any = {
    // default implementations
    column: 'id',
    applyIdToPayload: (payload: any, id: string | number) => {},
    getIdFromAssignment: (a: any) => '',
    counterField: null as string | null,
    capacityField: null as string | null,
    notificationType: null as NotificationType | null,
    fetchTitle: async (_manager: Manager, _id: string | number) =>
      undefined as Promise<string | undefined>,
  };

  const handlers: Record<string, any> = {
    task: {
      ...base,
      fkName: 'taskId',
      column: 'assignment.taskId',
      applyIdToPayload: (payload: any, id: string | number) => {
        payload.taskId = Number(id);
      },
      getIdFromAssignment: (a: any) =>
        a && a.taskId !== undefined && a.taskId !== null
          ? String(a.taskId)
          : '',
      counterField: 'currentTasksCount',
      capacityField: 'maxTasksCapacity',
      notificationType: NotificationType.TASK_ASSIGNED,
      fetchTitle: async (manager: Manager, id: string | number) => {
        try {
          const task = await manager.findOne(Task, {
            where: { id: Number(id) },
          });
          return task?.title || task?.name;
        } catch (e) {
          return undefined;
        }
      },
      // activity logging helpers
      logAssigned: async (
        userActivityService: any,
        actorId: string,
        entityId: string | number,
        title?: string
      ) => {
        if (!userActivityService) return;
        try {
          await userActivityService.logTaskAssigned(
            actorId,
            String(entityId),
            title || String(entityId)
          );
        } catch (e) {
          /* noop */
        }
      },
      logUnassigned: async (
        userActivityService: any,
        userId: string,
        entityId: string | number,
        title?: string
      ) => {
        if (!userActivityService) return;
        try {
          await userActivityService.logTaskUnassigned(
            userId,
            String(entityId),
            title || String(entityId)
          );
        } catch (e) {
          /* noop */
        }
      },
    },
    lead: {
      ...base,
      fkName: 'leadId',
      column: 'assignment.leadId',
      applyIdToPayload: (payload: any, id: string | number) => {
        payload.leadId = Number(id);
      },
      getIdFromAssignment: (a: any) =>
        a && a.leadId !== undefined && a.leadId !== null
          ? String(a.leadId)
          : '',
      counterField: 'currentLeadsCount',
      capacityField: 'maxLeadsCapacity',
      notificationType: NotificationType.LEAD_ASSIGNED,
      fetchTitle: async (manager: Manager, id: string | number) => {
        try {
          const lead = await manager.findOne(Lead, { where: { id: Number(id) } });
          return lead?.name;
        } catch (e) {
          return undefined;
        }
      },
      // activity logging helpers
      logAssigned: async (
        userActivityService: any,
        actorId: string,
        entityId: string | number,
        title?: string
      ) => {
        if (!userActivityService) return;
        try {
          await userActivityService.logLeadAssigned(
            actorId,
            String(entityId),
            title || String(entityId)
          );
        } catch (e) {
          /* noop */
        }
      },
      logUnassigned: async (
        userActivityService: any,
        userId: string,
        entityId: string | number,
        title?: string
      ) => {
        if (!userActivityService) return;
        try {
          await userActivityService.logLeadUnassigned(
            userId,
            String(entityId),
            title || String(entityId)
          );
        } catch (e) {
          /* noop */
        }
      },
    },
    deal: {
      ...base,
      fkName: 'dealId',
      column: 'assignment.dealId',
      applyIdToPayload: (payload: any, id: string | number) => {
        payload.dealId = String(id);
      },
      getIdFromAssignment: (a: any) =>
        a && a.dealId !== undefined && a.dealId !== null
          ? String(a.dealId)
          : '',
      counterField: 'currentDealsCount',
      capacityField: 'maxDealsCapacity',
      notificationType: NotificationType.DEAL_ASSIGNED,
      fetchTitle: async (manager: Manager, id: string | number) => {
        try {
          const deal = await manager.findOne(Deal, { where: { id: id } });
          return deal?.title;
        } catch (e) {
          return undefined;
        }
      },
      // activity logging helpers
      logAssigned: async (
        userActivityService: any,
        actorId: string,
        entityId: string | number,
        title?: string
      ) => {
        if (!userActivityService) return;
        try {
          await userActivityService.logDealAssigned(
            actorId,
            String(entityId),
            title || String(entityId)
          );
        } catch (e) {
          /* noop */
        }
      },
      logUnassigned: async (
        userActivityService: any,
        userId: string,
        entityId: string | number,
        title?: string
      ) => {
        if (!userActivityService) return;
        try {
          await userActivityService.logDealUnassigned(
            userId,
            String(entityId),
            title || String(entityId)
          );
        } catch (e) {
          /* noop */
        }
      },
    },
  };

  return handlers[entityType] || base;
}

export type EntityHandler = ReturnType<typeof getEntityHandler>;
