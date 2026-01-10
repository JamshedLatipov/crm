import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LeadDistributionRule, DistributionMethod } from '../entities/lead-distribution-rule.entity';
import { Lead } from '../entities/lead.entity';

@Injectable()
export class LeadDistributionService {
  private roundRobinIndex = 0;

  constructor(
    @InjectRepository(LeadDistributionRule)
    private readonly ruleRepo: Repository<LeadDistributionRule>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
  ) {}

  async getRules(): Promise<LeadDistributionRule[]> {
    return this.ruleRepo.find({ order: { priority: 'DESC' } });
  }

  async getRule(id: number): Promise<LeadDistributionRule | null> {
    return this.ruleRepo.findOneBy({ id });
  }

  async createRule(dto: Partial<LeadDistributionRule>): Promise<LeadDistributionRule> {
    const rule = this.ruleRepo.create(dto);
    return this.ruleRepo.save(rule);
  }

  async updateRule(id: number, dto: Partial<LeadDistributionRule>): Promise<LeadDistributionRule> {
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

  async toggleRule(id: number): Promise<LeadDistributionRule> {
    const rule = await this.ruleRepo.findOneBy({ id });
    if (!rule) {
      throw new NotFoundException(`Rule ${id} not found`);
    }
    rule.isActive = !rule.isActive;
    return this.ruleRepo.save(rule);
  }

  async autoAssign(leadId: number): Promise<{ leadId: number; assignedTo: number; method: string }> {
    const lead = await this.leadRepo.findOneBy({ id: leadId });
    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    const rules = await this.ruleRepo.find({ where: { isActive: true }, order: { priority: 'DESC' } });
    
    for (const rule of rules) {
      if (this.matchesConditions(rule, lead)) {
        const assignedTo = await this.selectAssignee(rule);
        if (assignedTo) {
          lead.assignedTo = assignedTo;
          await this.leadRepo.save(lead);
          return { leadId, assignedTo, method: rule.method };
        }
      }
    }

    // Default: use first active rule or round-robin
    const defaultRule = rules[0];
    if (defaultRule) {
      const assignedTo = await this.selectAssignee(defaultRule);
      if (assignedTo) {
        lead.assignedTo = assignedTo;
        await this.leadRepo.save(lead);
        return { leadId, assignedTo, method: defaultRule.method };
      }
    }

    throw new Error('No distribution rules configured or no available assignees');
  }

  async reassign(leadId: number, userId: number, reason?: string): Promise<{ success: boolean; previousAssignee?: number }> {
    const lead = await this.leadRepo.findOneBy({ id: leadId });
    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    const previousAssignee = lead.assignedTo;
    lead.assignedTo = userId;
    await this.leadRepo.save(lead);

    return { success: true, previousAssignee };
  }

  async bulkAssign(leadIds: number[], userId: number): Promise<{ assigned: number; failed: number[] }> {
    const leads = await this.leadRepo.find({ where: { id: In(leadIds) } });
    const failed: number[] = [];
    
    for (const id of leadIds) {
      const lead = leads.find(l => l.id === id);
      if (!lead) {
        failed.push(id);
        continue;
      }
      lead.assignedTo = userId;
    }

    await this.leadRepo.save(leads.filter(l => !failed.includes(l.id)));

    return { assigned: leadIds.length - failed.length, failed };
  }

  async getWorkload(): Promise<{ userId: number; count: number; capacity: number }[]> {
    const result = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.assignedTo', 'userId')
      .addSelect('COUNT(lead.id)', 'count')
      .where('lead.assignedTo IS NOT NULL')
      .groupBy('lead.assignedTo')
      .getRawMany();

    return result.map(r => ({
      userId: r.userId,
      count: parseInt(r.count, 10),
      capacity: 50, // Default capacity
    }));
  }

  async getStats(): Promise<{
    totalRules: number;
    activeRules: number;
    distributionByMethod: Record<string, number>;
    assignedLeads: number;
    unassignedLeads: number;
  }> {
    const rules = await this.ruleRepo.find();
    const totalLeads = await this.leadRepo.count();
    const assignedLeads = await this.leadRepo.count({ where: { assignedTo: In([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) } });

    const distributionByMethod = rules.reduce((acc, rule) => {
      acc[rule.method] = (acc[rule.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      distributionByMethod,
      assignedLeads,
      unassignedLeads: totalLeads - assignedLeads,
    };
  }

  private matchesConditions(rule: LeadDistributionRule, lead: Lead): boolean {
    if (!rule.conditions) return true;
    
    for (const [key, value] of Object.entries(rule.conditions)) {
      switch (key) {
        case 'source':
          if (lead.source !== value) return false;
          break;
        case 'region':
          // Check lead region if available
          break;
      }
    }
    
    return true;
  }

  private async selectAssignee(rule: LeadDistributionRule): Promise<number | null> {
    if (!rule.assignees || rule.assignees.length === 0) {
      return null;
    }

    switch (rule.method) {
      case DistributionMethod.ROUND_ROBIN:
        const assignee = rule.assignees[this.roundRobinIndex % rule.assignees.length]!;
        this.roundRobinIndex++;
        return assignee;

      case DistributionMethod.WEIGHTED:
        return this.selectByWeight(rule.assignees, rule.weights || {});

      case DistributionMethod.LOAD_BALANCED:
        return this.selectByLowestLoad(rule.assignees);

      case DistributionMethod.RANDOM:
        return rule.assignees[Math.floor(Math.random() * rule.assignees.length)]!;

      default:
        return rule.assignees[0]!;
    }
  }

  private selectByWeight(assignees: number[], weights: Record<string, number>): number {
    if (assignees.length === 0) return 0;
    const totalWeight = assignees.reduce((sum, id) => sum + (weights[id.toString()] || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const assignee of assignees) {
      random -= weights[assignee.toString()] || 1;
      if (random <= 0) return assignee;
    }
    
    return assignees[0]!;
  }

  private async selectByLowestLoad(assignees: number[]): Promise<number> {
    if (assignees.length === 0) return 0;
    const workloads = await this.getWorkload();
    let minLoad = Infinity;
    let selectedAssignee: number = assignees[0]!;

    for (const assignee of assignees) {
      const workload = workloads.find(w => w.userId === assignee);
      const load = workload?.count || 0;
      if (load < minLoad) {
        minLoad = load;
        selectedAssignee = assignee;
      }
    }

    return selectedAssignee;
  }
}
