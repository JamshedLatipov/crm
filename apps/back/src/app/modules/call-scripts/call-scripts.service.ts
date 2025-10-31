import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallScript } from './entities/call-script.entity';
import { CreateCallScriptDto, UpdateCallScriptDto } from './call-script.dto';

@Injectable()
export class CallScriptsService {
  constructor(
    @InjectRepository(CallScript)
    private readonly callScriptRepository: Repository<CallScript>,
  ) {}

  async findAll(): Promise<CallScript[]> {
    return this.callScriptRepository.find({
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CallScript | null> {
    return this.callScriptRepository.findOne({
      where: { id },
    });
  }

  async create(createCallScriptDto: CreateCallScriptDto): Promise<CallScript> {
    const callScript = this.callScriptRepository.create(createCallScriptDto);
    return this.callScriptRepository.save(callScript);
  }

  async update(id: string, updateCallScriptDto: UpdateCallScriptDto): Promise<CallScript | null> {
    await this.callScriptRepository.update(id, updateCallScriptDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.callScriptRepository.delete(id);
  }

  async findByCategory(categoryId: string): Promise<CallScript[]> {
    return this.callScriptRepository.find({
      where: { categoryId, isActive: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async findActive(): Promise<CallScript[]> {
    return this.callScriptRepository.find({
      where: { isActive: true },
      order: { updatedAt: 'DESC' },
    });
  }
}