import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallLog } from '../call/entities/call-log.entity';

export interface CdrFilterDto {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class CdrService {
  private readonly logger = new Logger(CdrService.name);

  constructor(
    @InjectRepository(CallLog)
    private readonly callLogRepository: Repository<CallLog>,
  ) {}

  async findAll(filter: CdrFilterDto) {
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.callLogRepository.createQueryBuilder('cdr');

    if (filter.startDate) {
      queryBuilder.andWhere('cdr.createdAt >= :startDate', { startDate: new Date(filter.startDate) });
    }

    if (filter.endDate) {
      queryBuilder.andWhere('cdr.createdAt <= :endDate', { endDate: new Date(filter.endDate) });
    }

    queryBuilder.orderBy('cdr.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findBySrc(src: string) {
    return this.callLogRepository.find({
      where: { createdBy: src },
      order: { createdAt: 'DESC' },
    });
  }

  async findByDst(dst: string) {
    return this.callLogRepository.find({
      where: { clientCallId: dst },
      order: { createdAt: 'DESC' },
    });
  }

  async findByDisposition(disposition: string) {
    return this.callLogRepository.find({
      where: { disposition },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUniqueId(uniqueId: string) {
    return this.callLogRepository.findOne({ where: { asteriskUniqueId: uniqueId } });
  }

  async getChannelUniqueId(callerNumber: string) {
    const record = await this.callLogRepository.findOne({
      where: { createdBy: callerNumber },
      order: { createdAt: 'DESC' },
    });
    return record?.asteriskUniqueId || null;
  }

  async createLog(data: {
    src?: string;
    dst?: string;
    uniqueId?: string;
    disposition?: string;
    duration?: number;
    note?: string;
  }) {
    const log = this.callLogRepository.create({
      createdBy: data.src,
      clientCallId: data.dst,
      asteriskUniqueId: data.uniqueId,
      disposition: data.disposition,
      duration: data.duration,
      note: data.note,
    });
    return this.callLogRepository.save(log);
  }

  async getLogs(filter: CdrFilterDto) {
    return this.findAll(filter);
  }

  async getLog(id: string) {
    return this.callLogRepository.findOne({ where: { id } });
  }
}
