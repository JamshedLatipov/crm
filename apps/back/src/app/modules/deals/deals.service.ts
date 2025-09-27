import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deal, DealStatus } from './deal.entity';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
  ) {}

  async listDeals(): Promise<Deal[]> {
    return this.dealRepository.find({
      relations: ['stage'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDealById(id: string): Promise<Deal> {
    const deal = await this.dealRepository.findOne({
      where: { id },
      relations: ['stage'],
    });

    if (!deal) {
      throw new NotFoundException(`Deal with id ${id} not found`);
    }

    return deal;
  }

  async createDeal(dto: CreateDealDto): Promise<Deal> {
    const deal = this.dealRepository.create({
      ...dto,
      expectedCloseDate: new Date(dto.expectedCloseDate),
    });

    return this.dealRepository.save(deal);
  }

  async updateDeal(id: string, dto: UpdateDealDto): Promise<Deal> {
    const deal = await this.getDealById(id);

    // Update fields
    Object.assign(deal, dto);

    if (dto.expectedCloseDate) {
      deal.expectedCloseDate = new Date(dto.expectedCloseDate);
    }

    if (dto.actualCloseDate) {
      deal.actualCloseDate = new Date(dto.actualCloseDate);
    }

    return this.dealRepository.save(deal);
  }

  async deleteDeal(id: string): Promise<void> {
    const deal = await this.getDealById(id);
    await this.dealRepository.remove(deal);
  }

  // Специальные методы для сделок
  async moveToStage(id: string, stageId: string): Promise<Deal> {
    return this.updateDeal(id, { stageId });
  }

  async winDeal(id: string, actualAmount?: number): Promise<Deal> {
    const updateData: UpdateDealDto = {
      status: DealStatus.WON,
      actualCloseDate: new Date().toISOString(),
    };

    if (actualAmount !== undefined) {
      updateData.amount = actualAmount;
    }

    return this.updateDeal(id, updateData);
  }

  async loseDeal(id: string, reason: string): Promise<Deal> {
    return this.updateDeal(id, {
      status: DealStatus.LOST,
      actualCloseDate: new Date().toISOString(),
      notes: reason,
    });
  }

  async updateProbability(id: string, probability: number): Promise<Deal> {
    return this.updateDeal(id, { probability });
  }

  async assignDeal(id: string, managerId: string): Promise<Deal> {
    return this.updateDeal(id, { assignedTo: managerId });
  }

  // Фильтрация и поиск
  async getDealsByStage(stageId: string): Promise<Deal[]> {
    return this.dealRepository.find({
      where: { stageId },
      relations: ['stage'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDealsByStatus(status: DealStatus): Promise<Deal[]> {
    return this.dealRepository.find({
      where: { status },
      relations: ['stage'],
      order: { createdAt: 'DESC' },
    });
  }

  async getDealsByManager(managerId: string): Promise<Deal[]> {
    return this.dealRepository.find({
      where: { assignedTo: managerId },
      relations: ['stage'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOverdueDeals(): Promise<Deal[]> {
    const today = new Date();
    return this.dealRepository
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.stage', 'stage')
      .where('deal.expectedCloseDate < :today', { today })
      .andWhere('deal.status = :status', { status: DealStatus.OPEN })
      .orderBy('deal.expectedCloseDate', 'ASC')
      .getMany();
  }

  async searchDeals(query: string): Promise<Deal[]> {
    return this.dealRepository
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.stage', 'stage')
      .where('deal.title ILIKE :query', { query: `%${query}%` })
      .orWhere("deal.contact->>'name' ILIKE :query", { query: `%${query}%` })
      .orWhere("deal.contact->>'company' ILIKE :query", { query: `%${query}%` })
      .orderBy('deal.createdAt', 'DESC')
      .getMany();
  }

  // Аналитика
  async getSalesForecast(period: 'month' | 'quarter' | 'year') {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      }
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
    }

    const deals = await this.dealRepository
      .createQueryBuilder('deal')
      .where('deal.expectedCloseDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('deal.status = :status', { status: DealStatus.OPEN })
      .getMany();

    const totalAmount = deals.reduce((sum, deal) => sum + Number(deal.amount), 0);
    const weightedAmount = deals.reduce(
      (sum, deal) => sum + Number(deal.amount) * (deal.probability / 100),
      0,
    );

    return {
      period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
      totalAmount,
      weightedAmount,
      dealsCount: deals.length,
    };
  }
}
