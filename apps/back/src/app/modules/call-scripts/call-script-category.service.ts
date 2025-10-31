import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallScriptCategory } from './entities/call-script-category.entity';
import { CreateCallScriptCategoryDto, UpdateCallScriptCategoryDto } from './dto/call-script-category.dto';

@Injectable()
export class CallScriptCategoryService {
  constructor(
    @InjectRepository(CallScriptCategory)
    private readonly categoryRepository: Repository<CallScriptCategory>,
  ) {}

  async create(createDto: CreateCallScriptCategoryDto): Promise<CallScriptCategory> {
    const category = this.categoryRepository.create({
      ...createDto,
      isActive: createDto.isActive ?? true,
      sortOrder: createDto.sortOrder ?? 0,
    });
    return await this.categoryRepository.save(category);
  }

  async findAll(): Promise<CallScriptCategory[]> {
    return await this.categoryRepository.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<CallScriptCategory> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Call script category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: string, updateDto: UpdateCallScriptCategoryDto): Promise<CallScriptCategory> {
    const category = await this.findOne(id);
    Object.assign(category, updateDto);
    return await this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }

  async findActive(): Promise<CallScriptCategory[]> {
    return await this.categoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }
}