import { Injectable, NotFoundException, Inject, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Deal, DealStatus } from './entities/deal.entity';
import { DealHistory, DealChangeType } from './entities/deal-history.entity';
import {
  CreateDealDto,
  UpdateDealDto,
  DealFilterDto,
  DealResponseDto,
  DealListResponseDto,
  DealStatsDto,
  ForecastDto,
  NOTIFICATION_SERVICE,
} from '@crm/contracts';

@Injectable()
export class DealService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
    @InjectRepository(DealHistory)
    private readonly historyRepository: Repository<DealHistory>,
    @Optional() @Inject(NOTIFICATION_SERVICE) private readonly notificationClient?: ClientProxy,
  ) {}

  async findAll(filter: DealFilterDto): Promise<DealListResponseDto> {
    const { page = 1, limit = 20, status, stageId, minAmount, maxAmount, search } = filter;
    const skip = (page - 1) * limit;

    const queryBuilder = this.dealRepository.createQueryBuilder('deal');

    if (status) {
      queryBuilder.andWhere('deal.status = :status', { status });
    }

    if (stageId) {
      queryBuilder.andWhere('deal.stageId = :stageId', { stageId });
    }

    if (minAmount !== undefined) {
      queryBuilder.andWhere('deal.amount >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      queryBuilder.andWhere('deal.amount <= :maxAmount', { maxAmount });
    }

    if (search) {
      queryBuilder.andWhere('deal.title ILIKE :search', { search: `%${search}%` });
    }

    queryBuilder.orderBy('deal.createdAt', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items: items.map(this.toResponseDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<DealResponseDto> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }
    return this.toResponseDto(deal);
  }

  async create(dto: CreateDealDto, userId?: string): Promise<DealResponseDto> {
    const deal = this.dealRepository.create({
      ...dto,
      expectedCloseDate: new Date(dto.expectedCloseDate),
    });
    const saved = await this.dealRepository.save(deal);

    await this.recordHistory(saved.id, DealChangeType.CREATED, userId, {
      description: `Deal "${saved.title}" created`,
    });

    return this.toResponseDto(saved);
  }

  async update(id: string, dto: UpdateDealDto, userId?: string): Promise<DealResponseDto> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    const oldStatus = deal.status;
    const oldStageId = deal.stageId;
    const oldAmount = deal.amount;

    Object.assign(deal, dto);
    if (dto.expectedCloseDate) {
      deal.expectedCloseDate = new Date(dto.expectedCloseDate);
    }

    const saved = await this.dealRepository.save(deal);

    // Record specific changes
    if (dto.status && dto.status !== oldStatus) {
      await this.recordHistory(id, DealChangeType.STATUS_CHANGED, userId, {
        fieldName: 'status',
        oldValue: oldStatus,
        newValue: dto.status,
        description: `Status changed from ${oldStatus} to ${dto.status}`,
      });
    }

    if (dto.stageId && dto.stageId !== oldStageId) {
      await this.recordHistory(id, DealChangeType.STAGE_MOVED, userId, {
        fieldName: 'stageId',
        oldValue: oldStageId,
        newValue: dto.stageId,
        description: `Deal moved to new stage`,
      });
    }

    if (dto.amount && dto.amount !== oldAmount) {
      await this.recordHistory(id, DealChangeType.AMOUNT_CHANGED, userId, {
        fieldName: 'amount',
        oldValue: String(oldAmount),
        newValue: String(dto.amount),
        description: `Amount changed from ${oldAmount} to ${dto.amount}`,
      });
    }

    return this.toResponseDto(saved);
  }

  async remove(id: string, userId?: string): Promise<void> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    await this.recordHistory(id, DealChangeType.DELETED, userId, {
      description: `Deal "${deal.title}" deleted`,
    });

    await this.dealRepository.remove(deal);
  }

  async winDeal(id: string, amount?: number, userId?: string): Promise<DealResponseDto> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    deal.status = DealStatus.WON;
    deal.actualCloseDate = new Date();
    deal.probability = 100;
    if (amount !== undefined) {
      deal.amount = amount;
    }

    const saved = await this.dealRepository.save(deal);

    await this.recordHistory(id, DealChangeType.WON, userId, {
      description: `Deal "${deal.title}" won`,
    });

    return this.toResponseDto(saved);
  }

  async loseDeal(id: string, reason?: string, userId?: string): Promise<DealResponseDto> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    deal.status = DealStatus.LOST;
    deal.actualCloseDate = new Date();
    deal.probability = 0;

    const saved = await this.dealRepository.save(deal);

    await this.recordHistory(id, DealChangeType.LOST, userId, {
      description: `Deal "${deal.title}" lost${reason ? `: ${reason}` : ''}`,
      metadata: reason ? { reason } : null,
    });

    return this.toResponseDto(saved);
  }

  async reopenDeal(id: string, userId?: string): Promise<DealResponseDto> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    deal.status = DealStatus.OPEN;
    deal.actualCloseDate = undefined;

    const saved = await this.dealRepository.save(deal);

    await this.recordHistory(id, DealChangeType.REOPENED, userId, {
      description: `Deal "${deal.title}" reopened`,
    });

    return this.toResponseDto(saved);
  }

  async moveToStage(id: string, stageId: string, userId?: string): Promise<DealResponseDto> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    const oldStageId = deal.stageId;
    deal.stageId = stageId;

    const saved = await this.dealRepository.save(deal);

    await this.recordHistory(id, DealChangeType.STAGE_MOVED, userId, {
      fieldName: 'stageId',
      oldValue: oldStageId,
      newValue: stageId,
      description: `Deal moved from stage ${oldStageId} to ${stageId}`,
    });

    return this.toResponseDto(saved);
  }

  async getStats(): Promise<DealStatsDto> {
    const totalDeals = await this.dealRepository.count();
    const openDeals = await this.dealRepository.count({ where: { status: DealStatus.OPEN } });
    const wonDeals = await this.dealRepository.count({ where: { status: DealStatus.WON } });
    const lostDeals = await this.dealRepository.count({ where: { status: DealStatus.LOST } });

    const totalValueResult = await this.dealRepository
      .createQueryBuilder('deal')
      .select('SUM(deal.amount)', 'total')
      .where('deal.status = :status', { status: DealStatus.OPEN })
      .getRawOne();

    const wonValueResult = await this.dealRepository
      .createQueryBuilder('deal')
      .select('SUM(deal.amount)', 'total')
      .where('deal.status = :status', { status: DealStatus.WON })
      .getRawOne();

    const avgDealSizeResult = await this.dealRepository
      .createQueryBuilder('deal')
      .select('AVG(deal.amount)', 'avg')
      .getRawOne();

    return {
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      totalValue: Number(totalValueResult?.total) || 0,
      wonValue: Number(wonValueResult?.total) || 0,
      avgDealSize: Number(avgDealSizeResult?.avg) || 0,
      winRate: totalDeals > 0 ? (wonDeals / (wonDeals + lostDeals)) * 100 || 0 : 0,
    };
  }

  async getForecast(startDate: Date, endDate: Date): Promise<ForecastDto> {
    const deals = await this.dealRepository.find({
      where: {
        status: DealStatus.OPEN,
        expectedCloseDate: Between(startDate, endDate),
      },
    });

    const weightedValue = deals.reduce((sum, deal) => {
      return sum + Number(deal.amount) * (deal.probability / 100);
    }, 0);

    const totalValue = deals.reduce((sum, deal) => sum + Number(deal.amount), 0);

    return {
      period: { start: startDate, end: endDate },
      dealsCount: deals.length,
      totalValue,
      weightedValue,
      avgProbability: deals.length > 0
        ? deals.reduce((sum, d) => sum + d.probability, 0) / deals.length
        : 0,
    };
  }

  async getByStage(stageId: string): Promise<DealResponseDto[]> {
    const deals = await this.dealRepository.find({
      where: { stageId, status: DealStatus.OPEN },
      order: { createdAt: 'DESC' },
    });
    return deals.map(this.toResponseDto);
  }

  async search(query: string): Promise<DealResponseDto[]> {
    const deals = await this.dealRepository.find({
      where: { title: ILike(`%${query}%`) },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return deals.map(this.toResponseDto);
  }

  async getOverdue(): Promise<DealResponseDto[]> {
    const now = new Date();
    const deals = await this.dealRepository
      .createQueryBuilder('deal')
      .where('deal.status = :status', { status: DealStatus.OPEN })
      .andWhere('deal.expectedCloseDate < :now', { now })
      .orderBy('deal.expectedCloseDate', 'ASC')
      .getMany();
    return deals.map(this.toResponseDto);
  }

  async getByCompany(companyId: string): Promise<DealResponseDto[]> {
    const deals = await this.dealRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
    return deals.map(this.toResponseDto);
  }

  async getByContact(contactId: string): Promise<DealResponseDto[]> {
    const deals = await this.dealRepository.find({
      where: { contactId },
      order: { createdAt: 'DESC' },
    });
    return deals.map(this.toResponseDto);
  }

  async getByLead(leadId: string): Promise<DealResponseDto[]> {
    const deals = await this.dealRepository.find({
      where: { leadId },
      order: { createdAt: 'DESC' },
    });
    return deals.map(this.toResponseDto);
  }

  async getByManager(managerId: string): Promise<DealResponseDto[]> {
    const deals = await this.dealRepository.find({
      where: { ownerId: managerId },
      order: { createdAt: 'DESC' },
    });
    return deals.map(this.toResponseDto);
  }

  async getAssignments(id: string): Promise<{ dealId: string; assignees: string[] }> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }
    return {
      dealId: id,
      assignees: deal.ownerId ? [deal.ownerId] : [],
    };
  }

  async updateProbability(id: string, probability: number, userId?: string): Promise<DealResponseDto> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    const oldProbability = deal.probability;
    deal.probability = probability;
    const saved = await this.dealRepository.save(deal);

    await this.recordHistory(id, DealChangeType.UPDATED, userId, {
      fieldName: 'probability',
      oldValue: String(oldProbability),
      newValue: String(probability),
      description: `Probability changed from ${oldProbability}% to ${probability}%`,
    });

    return this.toResponseDto(saved);
  }

  async getHistory(dealId: string, page?: number, limit?: number): Promise<DealHistory[]> {
    const take = limit || 50;
    const skip = page ? (page - 1) * take : 0;
    
    return this.historyRepository.find({
      where: { dealId },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
  }

  async getHistoryStats(dealId: string, dateFrom?: Date, dateTo?: Date): Promise<any> {
    const queryBuilder = this.historyRepository
      .createQueryBuilder('history')
      .where('history.dealId = :dealId', { dealId });

    if (dateFrom) {
      queryBuilder.andWhere('history.createdAt >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      queryBuilder.andWhere('history.createdAt <= :dateTo', { dateTo });
    }

    const totalChanges = await queryBuilder.getCount();

    const changesByType = await this.historyRepository
      .createQueryBuilder('history')
      .select('history.changeType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('history.dealId = :dealId', { dealId })
      .groupBy('history.changeType')
      .getRawMany();

    return {
      dealId,
      totalChanges,
      changesByType,
      period: { from: dateFrom, to: dateTo },
    };
  }

  async getStageMovementStats(dateFrom?: Date, dateTo?: Date): Promise<any> {
    const queryBuilder = this.historyRepository
      .createQueryBuilder('history')
      .where('history.changeType = :type', { type: DealChangeType.STAGE_MOVED });

    if (dateFrom) {
      queryBuilder.andWhere('history.createdAt >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      queryBuilder.andWhere('history.createdAt <= :dateTo', { dateTo });
    }

    const movements = await queryBuilder
      .select('history.oldValue', 'fromStage')
      .addSelect('history.newValue', 'toStage')
      .addSelect('COUNT(*)', 'count')
      .groupBy('history.oldValue')
      .addGroupBy('history.newValue')
      .getRawMany();

    return {
      movements,
      period: { from: dateFrom, to: dateTo },
    };
  }

  async getMostActiveDeals(limit: number, dateFrom?: Date, dateTo?: Date): Promise<any[]> {
    const queryBuilder = this.historyRepository
      .createQueryBuilder('history')
      .select('history.dealId', 'dealId')
      .addSelect('COUNT(*)', 'changesCount');

    if (dateFrom) {
      queryBuilder.andWhere('history.createdAt >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      queryBuilder.andWhere('history.createdAt <= :dateTo', { dateTo });
    }

    const activeDeals = await queryBuilder
      .groupBy('history.dealId')
      .orderBy('changesCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return activeDeals;
  }

  async getUserActivity(dateFrom?: Date, dateTo?: Date, limit: number = 10): Promise<any[]> {
    const queryBuilder = this.historyRepository
      .createQueryBuilder('history')
      .select('history.userId', 'userId')
      .addSelect('COUNT(*)', 'totalActions')
      .addSelect('COUNT(DISTINCT history.dealId)', 'uniqueDeals')
      .where('history.userId IS NOT NULL');

    if (dateFrom) {
      queryBuilder.andWhere('history.createdAt >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      queryBuilder.andWhere('history.createdAt <= :dateTo', { dateTo });
    }

    const userActivity = await queryBuilder
      .groupBy('history.userId')
      .orderBy('totalActions', 'DESC')
      .limit(limit)
      .getRawMany();

    return userActivity.map(item => ({
      userId: item.userId,
      totalActions: parseInt(item.totalActions, 10),
      uniqueDeals: parseInt(item.uniqueDeals, 10),
    }));
  }

  async linkContact(id: string, contactId: string, userId?: string): Promise<DealResponseDto> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    deal.contactId = contactId;
    const saved = await this.dealRepository.save(deal);

    await this.recordHistory(id, DealChangeType.CONTACT_LINKED, userId, {
      fieldName: 'contactId',
      newValue: contactId,
      description: `Contact ${contactId} linked to deal`,
    });

    return this.toResponseDto(saved);
  }

  async linkCompany(id: string, companyId: string, userId?: string): Promise<DealResponseDto> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    deal.companyId = companyId;
    const saved = await this.dealRepository.save(deal);

    await this.recordHistory(id, DealChangeType.COMPANY_LINKED, userId, {
      fieldName: 'companyId',
      newValue: companyId,
      description: `Company ${companyId} linked to deal`,
    });

    return this.toResponseDto(saved);
  }

  async linkLead(id: string, leadId: string, userId?: string): Promise<DealResponseDto> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    deal.leadId = leadId;
    const saved = await this.dealRepository.save(deal);

    await this.recordHistory(id, DealChangeType.LEAD_LINKED, userId, {
      fieldName: 'leadId',
      newValue: leadId,
      description: `Lead ${leadId} linked to deal`,
    });

    return this.toResponseDto(saved);
  }

  private async recordHistory(
    dealId: string,
    changeType: DealChangeType,
    userId?: string,
    data?: Partial<DealHistory>,
  ): Promise<void> {
    const history = this.historyRepository.create({
      dealId,
      changeType,
      userId,
      ...data,
    });
    await this.historyRepository.save(history);
  }

  private toResponseDto(deal: Deal): DealResponseDto {
    return {
      id: deal.id,
      title: deal.title,
      contactId: deal.contactId,
      companyId: deal.companyId,
      leadId: deal.leadId,
      amount: Number(deal.amount),
      currency: deal.currency,
      probability: deal.probability,
      expectedCloseDate: deal.expectedCloseDate,
      actualCloseDate: deal.actualCloseDate,
      stageId: deal.stageId,
      status: deal.status,
      notes: deal.notes,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    };
  }
}
