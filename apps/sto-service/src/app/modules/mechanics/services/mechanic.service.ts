import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mechanic } from '@libs/shared/sto-types';

@Injectable()
export class MechanicService {
  constructor(
    @InjectRepository(Mechanic)
    private mechanicRepository: Repository<Mechanic>,
  ) {}

  async findAll(): Promise<Mechanic[]> {
    return this.mechanicRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Mechanic> {
    const mechanic = await this.mechanicRepository.findOne({ where: { id } });
    if (!mechanic) {
      throw new NotFoundException(`Mechanic with ID ${id} not found`);
    }
    return mechanic;
  }

  async findByPin(pin: string): Promise<Mechanic | null> {
    return this.mechanicRepository.findOne({ where: { pin, isActive: true } });
  }
}
