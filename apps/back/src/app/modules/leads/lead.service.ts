import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './lead.entity';

@Injectable()
export class LeadService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>
  ) {}

  async create(data: Partial<Lead>): Promise<Lead> {
    return this.leadRepo.save(data);
  }

  async findAll(): Promise<Lead[]> {
    return this.leadRepo.find();
  }

  async findById(id: number): Promise<Lead | null> {
    return this.leadRepo.findOneBy({ id });
  }

  async update(id: number, data: Partial<Lead>): Promise<Lead> {
    await this.leadRepo.update(id, data);
    return this.findById(id);
  }

  async assignLead(id: number, user: string): Promise<Lead> {
    return this.update(id, { assignedTo: user });
  }

  async scoreLead(id: number, score: number): Promise<Lead> {
    return this.update(id, { score });
  }

  async changeStatus(id: number, status: string): Promise<Lead> {
    return this.update(id, { status });
  }
}
