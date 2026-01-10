import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LeadScoringRule, ScoringRuleType } from '../entities/lead-scoring-rule.entity';
import { LeadScore, LeadTemperature } from '../entities/lead-score.entity';
import { Lead } from '../entities/lead.entity';

@Injectable()
export class LeadScoringService {
  constructor(
    @InjectRepository(LeadScoringRule)
    private readonly ruleRepo: Repository<LeadScoringRule>,
    @InjectRepository(LeadScore)
    private readonly scoreRepo: Repository<LeadScore>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
  ) {}

  async getRules(): Promise<LeadScoringRule[]> {
    return this.ruleRepo.find({ order: { priority: 'DESC' } });
  }

  async getRule(id: number): Promise<LeadScoringRule | null> {
    return this.ruleRepo.findOneBy({ id });
  }

  async createRule(dto: Partial<LeadScoringRule>): Promise<LeadScoringRule> {
    const rule = this.ruleRepo.create(dto);
    return this.ruleRepo.save(rule);
  }

  async updateRule(id: number, dto: Partial<LeadScoringRule>): Promise<LeadScoringRule> {
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

  async toggleRule(id: number): Promise<LeadScoringRule> {
    const rule = await this.ruleRepo.findOneBy({ id });
    if (!rule) {
      throw new NotFoundException(`Rule ${id} not found`);
    }
    rule.isActive = !rule.isActive;
    return this.ruleRepo.save(rule);
  }

  async calculateScore(leadId: number): Promise<{ leadId: number; score: number; temperature: LeadTemperature }> {
    const lead = await this.leadRepo.findOneBy({ id: leadId });
    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    const rules = await this.ruleRepo.find({ where: { isActive: true }, order: { priority: 'DESC' } });
    
    let totalScore = 0;
    const criteria: Record<string, number> = {};

    for (const rule of rules) {
      const ruleScore = this.evaluateRule(rule, lead);
      if (ruleScore > 0) {
        totalScore += ruleScore;
        criteria[rule.name] = ruleScore;
      }
    }

    const temperature = this.calculateTemperature(totalScore);

    // Save or update score
    let scoreRecord = await this.scoreRepo.findOneBy({ leadId });
    if (!scoreRecord) {
      scoreRecord = this.scoreRepo.create({ leadId });
    }
    scoreRecord.totalScore = totalScore;
    scoreRecord.temperature = temperature;
    scoreRecord.criteria = criteria;
    scoreRecord.lastCalculatedAt = new Date();
    await this.scoreRepo.save(scoreRecord);

    return { leadId, score: totalScore, temperature };
  }

  async bulkCalculate(leadIds?: number[], forceRecalculate = false): Promise<{ processed: number; results: any[] }> {
    const leads = leadIds 
      ? await this.leadRepo.find({ where: { id: In(leadIds) } })
      : await this.leadRepo.find();

    const results = [];
    for (const lead of leads) {
      try {
        const result = await this.calculateScore(lead.id);
        results.push({ ...result, success: true });
      } catch (error) {
        results.push({ leadId: lead.id, error: (error as Error).message, success: false });
      }
    }

    return { processed: results.length, results };
  }

  async getScore(leadId: number): Promise<LeadScore | null> {
    return this.scoreRepo.findOne({ where: { leadId }, relations: ['lead'] });
  }

  async getHotLeads(limit: number): Promise<any[]> {
    const scores = await this.scoreRepo.find({
      where: { temperature: LeadTemperature.HOT },
      relations: ['lead'],
      order: { totalScore: 'DESC' },
      take: limit,
    });

    return scores.map(s => ({
      leadId: s.leadId,
      leadName: s.lead?.name,
      leadEmail: s.lead?.email,
      totalScore: s.totalScore,
      temperature: s.temperature,
      lastCalculatedAt: s.lastCalculatedAt,
    }));
  }

  getDefaultRules(): Partial<LeadScoringRule>[] {
    return [
      { name: 'Email Provided', type: ScoringRuleType.DEMOGRAPHIC, points: 10, conditions: { hasEmail: true } },
      { name: 'Phone Provided', type: ScoringRuleType.DEMOGRAPHIC, points: 15, conditions: { hasPhone: true } },
      { name: 'Company Provided', type: ScoringRuleType.FIRMOGRAPHIC, points: 20, conditions: { hasCompany: true } },
      { name: 'Website Visit', type: ScoringRuleType.BEHAVIORAL, points: 5, conditions: { websiteVisit: true } },
      { name: 'Form Submission', type: ScoringRuleType.ENGAGEMENT, points: 25, conditions: { formSubmission: true } },
      { name: 'Email Opened', type: ScoringRuleType.ENGAGEMENT, points: 10, conditions: { emailOpened: true } },
      { name: 'High Value Source', type: ScoringRuleType.CUSTOM, points: 30, conditions: { source: 'referral' } },
    ];
  }

  private evaluateRule(rule: LeadScoringRule, lead: Lead): number {
    if (!rule.conditions) {
      return rule.points;
    }

    // Simple condition evaluation
    for (const [key, value] of Object.entries(rule.conditions)) {
      switch (key) {
        case 'hasEmail':
          if (value && !lead.email) return 0;
          break;
        case 'hasPhone':
          if (value && !lead.phone) return 0;
          break;
        case 'hasCompany':
          if (value && !lead.companyId) return 0;
          break;
        case 'source':
          if (lead.source !== value) return 0;
          break;
      }
    }

    return rule.points;
  }

  private calculateTemperature(score: number): LeadTemperature {
    if (score >= 70) return LeadTemperature.HOT;
    if (score >= 30) return LeadTemperature.WARM;
    return LeadTemperature.COLD;
  }
}
