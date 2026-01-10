import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationRule, NotificationRuleTrigger } from '../entities/notification-rule.entity';

@Injectable()
export class NotificationRuleService {
  constructor(
    @InjectRepository(NotificationRule)
    private readonly ruleRepo: Repository<NotificationRule>,
  ) {}

  async getRules(): Promise<NotificationRule[]> {
    return this.ruleRepo.find({ order: { priority: 'DESC', createdAt: 'DESC' } });
  }

  async getRule(id: number): Promise<NotificationRule | null> {
    return this.ruleRepo.findOneBy({ id });
  }

  async getRulesByTrigger(trigger: NotificationRuleTrigger): Promise<NotificationRule[]> {
    return this.ruleRepo.find({ 
      where: { trigger, isActive: true },
      order: { priority: 'DESC' },
    });
  }

  async createRule(dto: Partial<NotificationRule>): Promise<NotificationRule> {
    const rule = this.ruleRepo.create(dto);
    return this.ruleRepo.save(rule);
  }

  async updateRule(id: number, dto: Partial<NotificationRule>): Promise<NotificationRule> {
    await this.ruleRepo.update(id, dto);
    const updated = await this.ruleRepo.findOneBy({ id });
    if (!updated) {
      throw new NotFoundException(`Rule ${id} not found`);
    }
    return updated;
  }

  async deleteRule(id: number): Promise<{ success: boolean }> {
    const result = await this.ruleRepo.delete(id);
    return { success: (result.affected ?? 0) > 0 };
  }

  async toggleRule(id: number): Promise<NotificationRule> {
    const rule = await this.ruleRepo.findOneBy({ id });
    if (!rule) {
      throw new NotFoundException(`Rule ${id} not found`);
    }
    rule.isActive = !rule.isActive;
    return this.ruleRepo.save(rule);
  }

  async evaluate(trigger: NotificationRuleTrigger, context: Record<string, any>): Promise<{
    matchedRules: NotificationRule[];
    notifications: any[];
  }> {
    const rules = await this.getRulesByTrigger(trigger);
    const matchedRules: NotificationRule[] = [];
    const notifications: any[] = [];

    for (const rule of rules) {
      if (this.matchesConditions(rule.conditions, context)) {
        matchedRules.push(rule);
        const notification = this.buildNotification(rule, context);
        notifications.push(notification);
      }
    }

    return { matchedRules, notifications };
  }

  async bulkToggle(ids: number[], isActive: boolean): Promise<{ updated: number }> {
    if (ids.length === 0) return { updated: 0 };
    const result = await this.ruleRepo.update(ids, { isActive });
    return { updated: result.affected ?? 0 };
  }

  async reorderRules(orderedIds: number[]): Promise<{ success: boolean }> {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if (id !== undefined) {
        await this.ruleRepo.update(id, { priority: orderedIds.length - i });
      }
    }
    return { success: true };
  }

  async getStats(): Promise<{
    totalRules: number;
    activeRules: number;
    rulesByTrigger: Record<string, number>;
    rulesByChannel: Record<string, number>;
  }> {
    const rules = await this.ruleRepo.find();
    
    const rulesByTrigger: Record<string, number> = {};
    const rulesByChannel: Record<string, number> = {};

    for (const rule of rules) {
      rulesByTrigger[rule.trigger] = (rulesByTrigger[rule.trigger] || 0) + 1;
      for (const channel of rule.channels) {
        rulesByChannel[channel] = (rulesByChannel[channel] || 0) + 1;
      }
    }

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      rulesByTrigger,
      rulesByChannel,
    };
  }

  async getDefaultRules(): Promise<Partial<NotificationRule>[]> {
    return [
      {
        name: 'New Lead Assigned',
        trigger: NotificationRuleTrigger.LEAD_ASSIGNED,
        template: { body: 'New lead {{leadName}} has been assigned to you' },
        recipients: { dynamic: 'assignee' },
      },
      {
        name: 'Deal Won',
        trigger: NotificationRuleTrigger.DEAL_WON,
        template: { body: 'Deal {{dealName}} worth {{dealValue}} has been won!' },
        recipients: { dynamic: 'owner' },
      },
      {
        name: 'Task Due Soon',
        trigger: NotificationRuleTrigger.TASK_DUE_SOON,
        template: { body: 'Task {{taskTitle}} is due in {{dueIn}}' },
        recipients: { dynamic: 'assignee' },
      },
      {
        name: 'Task Overdue',
        trigger: NotificationRuleTrigger.TASK_OVERDUE,
        template: { body: 'Task {{taskTitle}} is overdue!' },
        recipients: { dynamic: 'assignee' },
      },
      {
        name: 'Missed Call',
        trigger: NotificationRuleTrigger.CALL_MISSED,
        template: { body: 'Missed call from {{callerNumber}}' },
        recipients: { dynamic: 'assignee' },
      },
    ];
  }

  private matchesConditions(conditions: Record<string, any>, context: Record<string, any>): boolean {
    if (!conditions || Object.keys(conditions).length === 0) {
      return true;
    }

    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'object' && value !== null) {
        // Handle operators like $gt, $lt, $in, $eq
        for (const [op, opValue] of Object.entries(value)) {
          const contextValue = context[key];
          switch (op) {
            case '$eq':
              if (contextValue !== opValue) return false;
              break;
            case '$ne':
              if (contextValue === opValue) return false;
              break;
            case '$gt':
              if (contextValue <= (opValue as number)) return false;
              break;
            case '$gte':
              if (contextValue < (opValue as number)) return false;
              break;
            case '$lt':
              if (contextValue >= (opValue as number)) return false;
              break;
            case '$lte':
              if (contextValue > (opValue as number)) return false;
              break;
            case '$in':
              if (!Array.isArray(opValue) || !opValue.includes(contextValue)) return false;
              break;
            case '$nin':
              if (Array.isArray(opValue) && opValue.includes(contextValue)) return false;
              break;
          }
        }
      } else {
        // Direct equality check
        if (context[key] !== value) return false;
      }
    }

    return true;
  }

  private buildNotification(rule: NotificationRule, context: Record<string, any>): any {
    let body = rule.template?.body || '';
    
    // Replace template variables
    const variables = body.match(/\{\{(\w+)\}\}/g) || [];
    for (const variable of variables) {
      const key = variable.replace(/\{\{|\}\}/g, '');
      body = body.replace(variable, context[key] || '');
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      channels: rule.channels,
      recipients: rule.recipients,
      subject: rule.template?.subject,
      body,
      priority: rule.priority,
      context,
    };
  }
}
