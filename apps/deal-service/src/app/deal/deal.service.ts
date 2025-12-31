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

  async winDeal(id: string, userId?: string): Promise<DealResponseDto> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) {
      throw new NotFoundException(`Deal ${id} not found`);
    }

    deal.status = DealStatus.WON;
    deal.actualCloseDate = new Date();
    deal.probability = 100;

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

  async getHistory(dealId: string): Promise<DealHistory[]> {
    return this.historyRepository.find({
      where: { dealId },
      order: { createdAt: 'DESC' },
    });
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
