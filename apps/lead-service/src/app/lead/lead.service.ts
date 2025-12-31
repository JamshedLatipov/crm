import { Injectable, NotFoundException, Optional, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Lead, LeadStatus, LeadSource, LeadPriority } from './entities/lead.entity';
import { SERVICES, LEAD_EVENTS } from '@crm/contracts';
import {
  CreateLeadDto,
  UpdateLeadDto,
  LeadFilterDto,
  LeadListResponseDto,
  LeadResponseDto,
  LeadStatsDto,
} from '@crm/contracts';

@Injectable()
export class LeadService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @Optional() @Inject(SERVICES.NOTIFICATION)
    private readonly notificationClient?: ClientProxy,
  ) {}

  async findAll(filter: LeadFilterDto): Promise<LeadListResponseDto> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.leadRepository.createQueryBuilder('lead');

    if (filter.status) {
      queryBuilder.andWhere('lead.status = :status', { status: filter.status });
    }

    if (filter.source) {
      queryBuilder.andWhere('lead.source = :source', { source: filter.source });
    }

    if (filter.priority) {
      queryBuilder.andWhere('lead.priority = :priority', { priority: filter.priority });
    }

    if (filter.assigneeId) {
      queryBuilder.andWhere('lead.assigneeId = :assigneeId', { assigneeId: filter.assigneeId });
    }

    if (filter.isQualified !== undefined) {
      queryBuilder.andWhere('lead.isQualified = :isQualified', { isQualified: filter.isQualified });
    }

    if (filter.isConverted !== undefined) {
      queryBuilder.andWhere('lead.isConverted = :isConverted', { isConverted: filter.isConverted });
    }

    if (filter.minScore !== undefined) {
      queryBuilder.andWhere('lead.score >= :minScore', { minScore: filter.minScore });
    }

    if (filter.maxScore !== undefined) {
      queryBuilder.andWhere('lead.score <= :maxScore', { maxScore: filter.maxScore });
    }

    if (filter.search) {
      queryBuilder.andWhere(
        '(lead.name ILIKE :search OR lead.email ILIKE :search OR lead.phone ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    if (filter.fromDate) {
      queryBuilder.andWhere('lead.createdAt >= :fromDate', { fromDate: filter.fromDate });
    }

    if (filter.toDate) {
      queryBuilder.andWhere('lead.createdAt <= :toDate', { toDate: filter.toDate });
    }

    queryBuilder.orderBy('lead.createdAt', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map(this.toResponseDto),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findOne(id: number): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return this.toResponseDto(lead);
  }

  async search(query: string, page = 1, limit = 20): Promise<LeadListResponseDto> {
    const skip = (page - 1) * limit;
    const searchPattern = `%${query}%`;

    const [items, total] = await this.leadRepository.findAndCount({
      where: [
        { name: ILike(searchPattern) },
        { email: ILike(searchPattern) },
        { phone: ILike(searchPattern) },
      ],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map(this.toResponseDto),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async getStats(): Promise<LeadStatsDto> {
    const total = await this.leadRepository.count();
    const qualifiedCount = await this.leadRepository.count({ where: { isQualified: true } });
    const convertedCount = await this.leadRepository.count({ where: { status: LeadStatus.CONVERTED } });

    // Stats by status
    const statusStats = await this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('lead.status')
      .getRawMany();

    const byStatus = {} as Record<LeadStatus, number>;
    for (const stat of statusStats) {
      byStatus[stat.status as LeadStatus] = parseInt(stat.count);
    }

    // Stats by source
    const sourceStats = await this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .where('lead.source IS NOT NULL')
      .groupBy('lead.source')
      .getRawMany();

    const bySource = {} as Record<LeadSource, number>;
    for (const stat of sourceStats) {
      bySource[stat.source as LeadSource] = parseInt(stat.count);
    }

    // Stats by priority
    const priorityStats = await this.leadRepository
      .createQueryBuilder('lead')
      .select('lead.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('lead.priority')
      .getRawMany();

    const byPriority = {} as Record<LeadPriority, number>;
    for (const stat of priorityStats) {
      byPriority[stat.priority as LeadPriority] = parseInt(stat.count);
    }

    // Average score
    const scoreResult = await this.leadRepository
      .createQueryBuilder('lead')
      .select('AVG(lead.score)', 'avgScore')
      .addSelect('SUM(lead.estimatedValue)', 'totalValue')
      .getRawOne();

    return {
      total,
      byStatus,
      bySource,
      byPriority,
      qualifiedCount,
      convertedCount,
      averageScore: parseFloat(scoreResult?.avgScore || '0'),
      totalEstimatedValue: parseFloat(scoreResult?.totalValue || '0'),
    };
  }

  async getHighValueLeads(minValue: number = 10000): Promise<LeadResponseDto[]> {
    const leads = await this.leadRepository.find({
      where: { estimatedValue: MoreThanOrEqual(minValue), status: In([LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.PROPOSAL_SENT, LeadStatus.NEGOTIATING]) },
      order: { estimatedValue: 'DESC' },
      take: 50,
    });

    return leads.map(this.toResponseDto);
  }

  async getStaleLeads(days: number = 7): Promise<LeadResponseDto[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const leads = await this.leadRepository.find({
      where: {
        lastContactDate: LessThanOrEqual(cutoffDate),
        status: In([LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED]),
      },
      order: { lastContactDate: 'ASC' },
    });

    return leads.map(this.toResponseDto);
  }

  async create(dto: CreateLeadDto): Promise<LeadResponseDto> {
    const lead = this.leadRepository.create({
      ...dto,
      source: dto.source as LeadSource,
      priority: (dto.priority as LeadPriority) || LeadPriority.MEDIUM,
      status: LeadStatus.NEW,
      score: 0,
    } as Partial<Lead>);

    const saved = await this.leadRepository.save(lead) as Lead;

    this.emitEvent(LEAD_EVENTS.CREATED, { lead: this.toResponseDto(saved) });

    return this.toResponseDto(saved);
  }

  async update(id: number, dto: UpdateLeadDto): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    const changes = Object.keys(dto).filter(
      (key) => dto[key as keyof UpdateLeadDto] !== lead[key as keyof Lead]
    );

    Object.assign(lead, dto);
    const saved = await this.leadRepository.save(lead);

    this.emitEvent(LEAD_EVENTS.UPDATED, { lead: this.toResponseDto(saved), changes });

    return this.toResponseDto(saved);
  }

  async remove(id: number): Promise<void> {
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    await this.leadRepository.remove(lead);

    this.emitEvent(LEAD_EVENTS.DELETED, { leadId: id, leadName: lead.name });
  }

  async assign(id: number, assigneeId: number): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Note: assigneeId stored via assignments table, not on lead directly
    // This method just emits event for now
    this.emitEvent(LEAD_EVENTS.ASSIGNED, {
      leadId: id,
      newAssigneeId: assigneeId,
    });

    return this.toResponseDto(lead);
  }

  async bulkAssign(leadIds: number[], assigneeId: number): Promise<LeadResponseDto[]> {
    const leads = await this.leadRepository.find({ where: { id: In(leadIds) } });

    // Note: assigneeId stored via assignments table, not on lead directly
    // Emit events for each lead
    for (const lead of leads) {
      this.emitEvent(LEAD_EVENTS.ASSIGNED, {
        leadId: lead.id,
        newAssigneeId: assigneeId,
      });
    }

    return leads.map(this.toResponseDto);
  }

  async updateScore(id: number, score: number): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    lead.score = score;
    const saved = await this.leadRepository.save(lead);

    this.emitEvent(LEAD_EVENTS.SCORED, { leadId: id, newScore: score });

    return this.toResponseDto(saved);
  }

  async changeStatus(id: number, status: LeadStatus): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    const previousStatus = lead.status;
    lead.status = status;

    const saved = await this.leadRepository.save(lead);

    this.emitEvent(LEAD_EVENTS.STATUS_CHANGED, {
      leadId: id,
      previousStatus,
      newStatus: status,
    });

    return this.toResponseDto(saved);
  }

  async qualify(id: number, qualified: boolean): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    lead.isQualified = qualified;

    if (qualified) {
      lead.status = LeadStatus.QUALIFIED;
    }

    const saved = await this.leadRepository.save(lead);

    return this.toResponseDto(saved);
  }

  async updateLastContact(id: number): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    lead.lastContactDate = new Date();
    lead.contactAttempts = (lead.contactAttempts || 0) + 1;

    const saved = await this.leadRepository.save(lead);

    return this.toResponseDto(saved);
  }

  async addTags(id: number, tags: string[]): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    const existingTags = lead.tags || [];
    lead.tags = [...new Set([...existingTags, ...tags])];

    const saved = await this.leadRepository.save(lead);

    return this.toResponseDto(saved);
  }

  async removeTags(id: number, tags: string[]): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    lead.tags = (lead.tags || []).filter((t) => !tags.includes(t));

    const saved = await this.leadRepository.save(lead);

    return this.toResponseDto(saved);
  }

  async scheduleFollowUp(id: number, followUpDate: Date): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    lead.nextFollowUpDate = followUpDate;

    const saved = await this.leadRepository.save(lead);

    return this.toResponseDto(saved);
  }

  private toResponseDto(lead: Lead): LeadResponseDto {
    return {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      companyId: lead.companyId,
      position: lead.position,
      website: lead.website,
      industry: lead.industry,
      country: lead.country,
      city: lead.city,
      address: lead.address,
      status: lead.status as any,
      score: lead.score,
      source: lead.source as any,
      sourceDetails: lead.sourceDetails,
      campaign: lead.campaign,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      utmContent: lead.utmContent,
      utmTerm: lead.utmTerm,
      priority: lead.priority as any,
      budget: lead.budget ? Number(lead.budget) : undefined,
      estimatedValue: lead.estimatedValue ? Number(lead.estimatedValue) : undefined,
      decisionTimeframe: lead.decisionTimeframe,
      conversionProbability: Number(lead.conversionProbability),
      notes: lead.notes,
      customFields: lead.customFields,
      tags: lead.tags,
      lastContactDate: lead.lastContactDate,
      nextFollowUpDate: lead.nextFollowUpDate,
      contactAttempts: lead.contactAttempts,
      isQualified: lead.isQualified,
      isUnsubscribed: lead.isUnsubscribed,
      isDoNotCall: lead.isDoNotCall,
      promoCompanyId: lead.promoCompanyId,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }

  private emitEvent(eventType: string, payload: Record<string, unknown>): void {
    if (this.notificationClient) {
      this.notificationClient.emit(eventType, {
        type: eventType,
        timestamp: new Date().toISOString(),
        payload,
      });
    }
  }
}
