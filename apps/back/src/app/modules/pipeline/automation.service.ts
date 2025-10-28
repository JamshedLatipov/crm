import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineService } from './pipeline.service';
import { AutomationRule, AutomationTrigger, AutomationCondition, AutomationAction } from './pipeline.entity';
import { Deal } from '../deals/deal.entity';
import { Lead } from '../leads/lead.entity';
import { DealsService } from '../deals/deals.service';
import { LeadService } from '../leads/lead.service';

interface AutomationContext {
  entityType: 'deal' | 'lead';
  entityId: string;
  entity: Deal | Lead;
  trigger: AutomationTrigger;
  changes?: Record<string, { old: any; new: any }>;
  userId?: string;
  userName?: string;
}

@Injectable()
export class AutomationService implements OnModuleInit, OnModuleDestroy {
  private interval: NodeJS.Timeout | null = null;
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private svc: PipelineService,
    @InjectRepository(AutomationRule)
    private automationRulesRepo: Repository<AutomationRule>,
    @Inject(forwardRef(() => DealsService))
    private dealsService: DealsService,
    @Inject(forwardRef(() => LeadService))
    private leadService: LeadService,
  ) {}

  onModuleInit() {
    // run every 60s for time-based automation
    this.interval = setInterval(() => {
      this.processTimeBasedAutomation().catch((e) => this.logger.error('Time-based automation error', e as any));
    }, 60_000);
    this.logger.log('AutomationService started');
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
    this.logger.log('AutomationService stopped');
  }

  /**
   * Process automation rules for a specific trigger and context
   */
  async processAutomationTrigger(context: AutomationContext): Promise<void> {
    try {
      // Get active rules for this trigger, ordered by priority
      const rules = await this.automationRulesRepo.find({
        where: { trigger: context.trigger, isActive: true },
        order: { priority: 'ASC' }
      });

      this.logger.log(`Processing ${rules.length} automation rules for trigger ${context.trigger}`);

      for (const rule of rules) {
        try {
          // Check if conditions are met
          const conditionsMet = await this.evaluateConditions(rule.conditions, context);
          if (!conditionsMet) {
            continue;
          }

          // Execute actions
          await this.executeActions(rule.actions, context);

          // Update rule statistics
          rule.triggerCount += 1;
          rule.lastTriggeredAt = new Date();
          await this.automationRulesRepo.save(rule);

          this.logger.log(`Executed automation rule "${rule.name}" for ${context.entityType} ${context.entityId}`);
        } catch (error) {
          this.logger.error(`Error processing automation rule "${rule.name}":`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error processing automation trigger:', error);
    }
  }

  /**
   * Evaluate all conditions for a rule
   */
  private async evaluateConditions(conditions: any[], context: AutomationContext): Promise<boolean> {
    for (const condition of conditions) {
      const met = await this.evaluateCondition(condition, context);
      if (!met) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: any, context: AutomationContext): Promise<boolean> {
    const { field, operator, value, value2 } = condition;
    const entity = context.entity;

    let fieldValue: any;

    // Extract field value based on condition type
    switch (field) {
      case AutomationCondition.STAGE_EQUALS:
      case AutomationCondition.STAGE_NOT_EQUALS:
        fieldValue = context.entityType === 'deal' ? (entity as Deal).stageId : null;
        break;
      case AutomationCondition.STATUS_EQUALS:
      case AutomationCondition.STATUS_NOT_EQUALS:
        fieldValue = entity.status;
        break;
      case AutomationCondition.AMOUNT_GREATER_THAN:
      case AutomationCondition.AMOUNT_LESS_THAN:
      case AutomationCondition.AMOUNT_BETWEEN:
        fieldValue = context.entityType === 'deal' ? (entity as Deal).amount : null;
        break;
      case AutomationCondition.PROBABILITY_GREATER_THAN:
      case AutomationCondition.PROBABILITY_LESS_THAN:
        fieldValue = context.entityType === 'deal' ? (entity as Deal).probability : null;
        break;
      case AutomationCondition.ASSIGNED_TO_EQUALS:
      case AutomationCondition.ASSIGNED_TO_NOT_EQUALS:
        // For now, skip assignment checks as they require additional queries
        // TODO: Implement proper assignment checking
        fieldValue = null;
        break;
      case AutomationCondition.TAGS_CONTAIN:
      case AutomationCondition.TAGS_NOT_CONTAIN:
        fieldValue = (entity as any).tags || [];
        break;
      case AutomationCondition.SOURCE_EQUALS:
      case AutomationCondition.SOURCE_NOT_EQUALS:
        fieldValue = (entity as any).source;
        break;
      case AutomationCondition.PRIORITY_EQUALS:
      case AutomationCondition.PRIORITY_NOT_EQUALS:
        fieldValue = context.entityType === 'lead' ? (entity as Lead).priority : null;
        break;
      case AutomationCondition.SCORE_GREATER_THAN:
      case AutomationCondition.SCORE_LESS_THAN:
        fieldValue = context.entityType === 'lead' ? (entity as Lead).score : null;
        break;
      case AutomationCondition.CREATED_WITHIN_DAYS:
        const createdDays = Math.floor((Date.now() - entity.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        fieldValue = createdDays;
        break;
      case AutomationCondition.UPDATED_WITHIN_HOURS:
        const updatedHours = Math.floor((Date.now() - entity.updatedAt.getTime()) / (1000 * 60 * 60));
        fieldValue = updatedHours;
        break;
      default:
        this.logger.warn(`Unknown condition field: ${field}`);
        return false;
    }

    // Apply operator
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'between':
        return Number(fieldValue) >= Number(value) && Number(fieldValue) <= Number(value2);
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(value);
        }
        return String(fieldValue).includes(String(value));
      case 'not_contains':
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(value);
        }
        return !String(fieldValue).includes(String(value));
      default:
        return false;
    }
  }

  /**
   * Execute all actions for a rule
   */
  private async executeActions(actions: any[], context: AutomationContext): Promise<void> {
    for (const action of actions) {
      await this.executeAction(action, context);
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: any, context: AutomationContext): Promise<void> {
    const { type, config } = action;

    try {
      switch (type) {
        case AutomationAction.CHANGE_STAGE:
          await this.executeChangeStage(config, context);
          break;

        case AutomationAction.CHANGE_STATUS:
          await this.executeChangeStatus(config, context);
          break;

        case AutomationAction.ASSIGN_TO_USER:
          await this.executeAssignToUser(config, context);
          break;

        case AutomationAction.UPDATE_AMOUNT:
          await this.executeUpdateAmount(config, context);
          break;

        case AutomationAction.UPDATE_PROBABILITY:
          await this.executeUpdateProbability(config, context);
          break;

        case AutomationAction.UPDATE_SCORE:
          await this.executeUpdateScore(config, context);
          break;

        case AutomationAction.ADD_TAGS:
          await this.executeAddTags(config, context);
          break;

        case AutomationAction.REMOVE_TAGS:
          await this.executeRemoveTags(config, context);
          break;

        case AutomationAction.SEND_NOTIFICATION:
          await this.executeSendNotification(config, context);
          break;

        case AutomationAction.CREATE_TASK:
          await this.executeCreateTask(config, context);
          break;

        case AutomationAction.SET_REMINDER:
          await this.executeSetReminder(config, context);
          break;

        case AutomationAction.LOG_ACTIVITY:
          await this.executeLogActivity(config, context);
          break;

        default:
          this.logger.warn(`Unknown action type: ${type}`);
      }
    } catch (error) {
      this.logger.error(`Error executing action ${type}:`, error);
    }
  }

  /**
   * Execute change stage action
   */
  private async executeChangeStage(config: any, context: AutomationContext): Promise<void> {
    if (!config.stageId) {
      this.logger.warn('Change stage action missing stageId');
      return;
    }

    if (context.entityType === 'deal') {
      await this.dealsService.moveToStage(context.entityId, config.stageId, context.userId, context.userName);
      this.logger.log(`Automation: Changed deal ${context.entityId} stage to ${config.stageId}`);
    } else {
      this.logger.warn('Change stage action only supported for deals');
    }
  }

  /**
   * Execute change status action
   */
  private async executeChangeStatus(config: any, context: AutomationContext): Promise<void> {
    if (!config.status) {
      this.logger.warn('Change status action missing status');
      return;
    }

    if (context.entityType === 'deal') {
      await this.dealsService.updateDeal(context.entityId, { status: config.status }, context.userId, context.userName);
      this.logger.log(`Automation: Changed deal ${context.entityId} status to ${config.status}`);
    } else if (context.entityType === 'lead') {
      await this.leadService.changeStatus(Number(context.entityId), config.status, context.userId, context.userName);
      this.logger.log(`Automation: Changed lead ${context.entityId} status to ${config.status}`);
    }
  }

  /**
   * Execute assign to user action
   */
  private async executeAssignToUser(config: any, context: AutomationContext): Promise<void> {
    if (!config.userId) {
      this.logger.warn('Assign to user action missing userId');
      return;
    }

    if (context.entityType === 'deal') {
      await this.dealsService.assignDeal(context.entityId, config.userId, context.userId, context.userName);
      this.logger.log(`Automation: Assigned deal ${context.entityId} to user ${config.userId}`);
    } else if (context.entityType === 'lead') {
      await this.leadService.assignLead(Number(context.entityId), config.userId, context.userId ? Number(context.userId) : undefined, context.userName);
      this.logger.log(`Automation: Assigned lead ${context.entityId} to user ${config.userId}`);
    }
  }

  /**
   * Execute update amount action
   */
  private async executeUpdateAmount(config: any, context: AutomationContext): Promise<void> {
    if (config.amount === undefined || config.amount === null) {
      this.logger.warn('Update amount action missing amount');
      return;
    }

    if (context.entityType === 'deal') {
      await this.dealsService.updateDeal(context.entityId, { amount: config.amount }, context.userId, context.userName);
      this.logger.log(`Automation: Updated deal ${context.entityId} amount to ${config.amount}`);
    } else {
      this.logger.warn('Update amount action only supported for deals');
    }
  }

  /**
   * Execute update probability action
   */
  private async executeUpdateProbability(config: any, context: AutomationContext): Promise<void> {
    if (config.probability === undefined || config.probability === null) {
      this.logger.warn('Update probability action missing probability');
      return;
    }

    if (context.entityType === 'deal') {
      await this.dealsService.updateProbability(context.entityId, config.probability, context.userId, context.userName);
      this.logger.log(`Automation: Updated deal ${context.entityId} probability to ${config.probability}%`);
    } else {
      this.logger.warn('Update probability action only supported for deals');
    }
  }

  /**
   * Execute update score action
   */
  private async executeUpdateScore(config: any, context: AutomationContext): Promise<void> {
    if (config.score === undefined || config.score === null) {
      this.logger.warn('Update score action missing score');
      return;
    }

    if (context.entityType === 'lead') {
      await this.leadService.scoreLead(Number(context.entityId), config.score, context.userId, context.userName);
      this.logger.log(`Automation: Updated lead ${context.entityId} score to ${config.score}`);
    } else {
      this.logger.warn('Update score action only supported for leads');
    }
  }

  /**
   * Execute add tags action
   */
  private async executeAddTags(config: any, context: AutomationContext): Promise<void> {
    if (!config.tags || !Array.isArray(config.tags) || config.tags.length === 0) {
      this.logger.warn('Add tags action missing tags array');
      return;
    }

    if (context.entityType === 'deal') {
      // For deals, we need to implement tag management
      // For now, just log
      this.logger.log(`Automation: Add tags ${config.tags.join(', ')} to deal ${context.entityId}`);
    } else if (context.entityType === 'lead') {
      await this.leadService.addTags(Number(context.entityId), config.tags);
      this.logger.log(`Automation: Added tags ${config.tags.join(', ')} to lead ${context.entityId}`);
    }
  }

  /**
   * Execute remove tags action
   */
  private async executeRemoveTags(config: any, context: AutomationContext): Promise<void> {
    if (!config.tags || !Array.isArray(config.tags) || config.tags.length === 0) {
      this.logger.warn('Remove tags action missing tags array');
      return;
    }

    if (context.entityType === 'deal') {
      // For deals, we need to implement tag management
      // For now, just log
      this.logger.log(`Automation: Remove tags ${config.tags.join(', ')} from deal ${context.entityId}`);
    } else if (context.entityType === 'lead') {
      await this.leadService.removeTags(Number(context.entityId), config.tags);
      this.logger.log(`Automation: Removed tags ${config.tags.join(', ')} from lead ${context.entityId}`);
    }
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotification(config: any, context: AutomationContext): Promise<void> {
    if (!config.message) {
      this.logger.warn('Send notification action missing message');
      return;
    }

    // For now, just log the notification
    // TODO: Implement actual notification sending via NotificationService
    this.logger.log(`Automation: Send notification "${config.message}" for ${context.entityType} ${context.entityId}`);

    // Log activity for the entity
    if (context.entityType === 'deal') {
      // TODO: Add activity logging for deals
    } else if (context.entityType === 'lead') {
      await this.leadService.addNote(Number(context.entityId), `Автоматическое уведомление: ${config.message}`, context.userId);
    }
  }

  /**
   * Execute create task action
   */
  private async executeCreateTask(config: any, context: AutomationContext): Promise<void> {
    if (!config.title) {
      this.logger.warn('Create task action missing title');
      return;
    }

    // For now, just log the task creation
    // TODO: Implement actual task creation via TaskService
    this.logger.log(`Automation: Create task "${config.title}" for ${context.entityType} ${context.entityId}`);

    // Log activity for the entity
    if (context.entityType === 'deal') {
      // TODO: Add activity logging for deals
    } else if (context.entityType === 'lead') {
      await this.leadService.addNote(Number(context.entityId), `Автоматическая задача: ${config.title}`, context.userId);
    }
  }

  /**
   * Execute set reminder action
   */
  private async executeSetReminder(config: any, context: AutomationContext): Promise<void> {
    if (!config.date) {
      this.logger.warn('Set reminder action missing date');
      return;
    }

    const reminderDate = new Date(config.date);
    if (isNaN(reminderDate.getTime())) {
      this.logger.warn('Set reminder action has invalid date');
      return;
    }

    // For now, just log the reminder
    // TODO: Implement actual reminder system
    this.logger.log(`Automation: Set reminder for ${reminderDate.toISOString()} for ${context.entityType} ${context.entityId}`);

    // For leads, we can use follow-up scheduling
    if (context.entityType === 'lead') {
      await this.leadService.scheduleFollowUp(Number(context.entityId), reminderDate, config.note || 'Автоматическое напоминание');
    }
  }

  /**
   * Execute log activity action
   */
  private async executeLogActivity(config: any, context: AutomationContext): Promise<void> {
    if (!config.note) {
      this.logger.warn('Log activity action missing note');
      return;
    }

    this.logger.log(`Automation: Log activity "${config.note}" for ${context.entityType} ${context.entityId}`);

    // Log activity for the entity
    if (context.entityType === 'deal') {
      // TODO: Add activity logging for deals
    } else if (context.entityType === 'lead') {
      await this.leadService.addNote(Number(context.entityId), config.note, context.userId);
    }
  }

  /**
   * Process time-based automation rules
   */
  private async processTimeBasedAutomation(): Promise<void> {
    try {
      const timeBasedRules = await this.automationRulesRepo.find({
        where: { trigger: AutomationTrigger.TIME_BASED, isActive: true }
      });

      for (const rule of timeBasedRules) {
        try {
          // For now, just log time-based automation - will be implemented later
          this.logger.log(`Time-based automation rule "${rule.name}" triggered`);
          
          // TODO: Implement time-based logic for deals and leads
          // const overdueDeals = await this.dealsService.getOverdueDeals();
          
          rule.triggerCount += 1;
          rule.lastTriggeredAt = new Date();
          await this.automationRulesRepo.save(rule);
        } catch (error) {
          this.logger.error(`Error processing time-based rule "${rule.name}":`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error in time-based automation:', error);
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async processAutomation(): Promise<void> {
    // This can be kept for backward compatibility or removed
    // The new system handles automation through triggers
  }

  /**
   * Handle deal creation event
   */
  async onDealCreated(deal: Deal, userId?: string, userName?: string): Promise<void> {
    await this.processAutomationTrigger({
      entityType: 'deal',
      entityId: deal.id,
      entity: deal,
      trigger: AutomationTrigger.DEAL_CREATED,
      userId,
      userName,
    });
  }

  /**
   * Handle deal update event
   */
  async onDealUpdated(deal: Deal, changes: Record<string, { old: any; new: any }>, userId?: string, userName?: string): Promise<void> {
    // Check for specific triggers
    const triggers = [AutomationTrigger.DEAL_UPDATED];

    if (changes.stageId) {
      triggers.push(AutomationTrigger.DEAL_STAGE_CHANGED);
    }
    if (changes.amount) {
      triggers.push(AutomationTrigger.DEAL_AMOUNT_CHANGED);
    }
    if (changes.status) {
      triggers.push(AutomationTrigger.DEAL_STATUS_CHANGED);
    }
    if (changes.assignedTo) {
      triggers.push(AutomationTrigger.DEAL_ASSIGNED);
    }

    for (const trigger of triggers) {
      await this.processAutomationTrigger({
        entityType: 'deal',
        entityId: deal.id,
        entity: deal,
        trigger,
        changes,
        userId,
        userName,
      });
    }
  }

  /**
   * Handle lead creation event
   */
  async onLeadCreated(lead: Lead, userId?: string, userName?: string): Promise<void> {
    await this.processAutomationTrigger({
      entityType: 'lead',
      entityId: lead.id.toString(),
      entity: lead,
      trigger: AutomationTrigger.LEAD_CREATED,
      userId,
      userName,
    });
  }

  /**
   * Handle lead update event
   */
  async onLeadUpdated(lead: Lead, changes: Record<string, { old: any; new: any }>, userId?: string, userName?: string): Promise<void> {
    // Check for specific triggers
    const triggers = [AutomationTrigger.LEAD_UPDATED];

    if (changes.status) {
      triggers.push(AutomationTrigger.LEAD_STATUS_CHANGED);
    }
    if (changes.assignedTo) {
      triggers.push(AutomationTrigger.LEAD_ASSIGNED);
    }
    if (changes.score) {
      triggers.push(AutomationTrigger.LEAD_SCORE_CHANGED);
    }

    for (const trigger of triggers) {
      await this.processAutomationTrigger({
        entityType: 'lead',
        entityId: lead.id.toString(),
        entity: lead,
        trigger,
        changes,
        userId,
        userName,
      });
    }
  }
}
