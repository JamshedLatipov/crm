import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Segment, SegmentFilter } from './segment.entity';

export interface CreateSegmentDto {
  name: string;
  description?: string;
  filters: SegmentFilter[];
  filterLogic?: 'AND' | 'OR';
  isActive?: boolean;
  isDynamic?: boolean;
}

export interface UpdateSegmentDto {
  name?: string;
  description?: string;
  filters?: SegmentFilter[];
  filterLogic?: 'AND' | 'OR';
  isActive?: boolean;
  isDynamic?: boolean;
}

export interface SegmentFilterOptions {
  isActive?: boolean;
  isDynamic?: boolean;
  search?: string;
}

@Injectable()
export class SegmentService {
  private readonly logger = new Logger(SegmentService.name);

  constructor(
    @InjectRepository(Segment)
    private readonly segmentRepository: Repository<Segment>,
  ) {}

  async create(dto: CreateSegmentDto, userId?: string): Promise<Segment> {
    const segment = this.segmentRepository.create({
      ...dto,
      createdBy: userId,
      filterLogic: dto.filterLogic || 'AND',
    });
    return this.segmentRepository.save(segment);
  }

  async findAll(options?: SegmentFilterOptions): Promise<Segment[]> {
    const queryBuilder = this.segmentRepository.createQueryBuilder('segment');

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('segment.isActive = :isActive', { isActive: options.isActive });
    }

    if (options?.isDynamic !== undefined) {
      queryBuilder.andWhere('segment.isDynamic = :isDynamic', { isDynamic: options.isDynamic });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(segment.name ILIKE :search OR segment.description ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    return queryBuilder.orderBy('segment.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<Segment> {
    const segment = await this.segmentRepository.findOne({ where: { id } });
    if (!segment) {
      throw new NotFoundException(`Segment with ID ${id} not found`);
    }
    return segment;
  }

  async update(id: number, dto: UpdateSegmentDto): Promise<Segment> {
    const segment = await this.findOne(id);
    Object.assign(segment, dto);
    return this.segmentRepository.save(segment);
  }

  async delete(id: number): Promise<void> {
    const segment = await this.findOne(id);
    await this.segmentRepository.remove(segment);
  }

  async getSegmentContacts(
    id: number,
    pagination?: { limit?: number; offset?: number },
  ): Promise<{ contacts: any[]; total: number }> {
    // In a real implementation, this would query contacts based on segment filters
    // For now, return empty array as placeholder
    const segment = await this.findOne(id);
    this.logger.log(`Getting contacts for segment ${id} with filters: ${JSON.stringify(segment.filters)}`);
    
    return {
      contacts: [],
      total: segment.contactsCount,
    };
  }

  async getSegmentPhoneNumbers(id: number): Promise<string[]> {
    // In a real implementation, this would return phone numbers of contacts in segment
    await this.findOne(id);
    return [];
  }

  async recalculate(id: number): Promise<number> {
    const segment = await this.findOne(id);
    // In a real implementation, this would count contacts matching filters
    // For now, keep existing count
    return segment.contactsCount;
  }

  async previewSegment(
    filters: SegmentFilter[],
    filterLogic: 'AND' | 'OR',
    limit: number = 10,
  ): Promise<{ contacts: any[]; estimatedTotal: number }> {
    // In a real implementation, this would query contacts based on filters
    this.logger.log(`Previewing segment with filters: ${JSON.stringify(filters)}`);
    return {
      contacts: [],
      estimatedTotal: 0,
    };
  }
}
