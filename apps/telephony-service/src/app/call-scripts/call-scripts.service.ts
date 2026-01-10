import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { CallScript } from './entities/call-script.entity';
import { CallScriptCategory } from './entities/call-script-category.entity';

export interface CreateCallScriptDto {
  title: string;
  description?: string;
  categoryId?: string;
  parentId?: string;
  steps?: string[];
  questions?: string[];
  tips?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateCallScriptDto = Partial<CreateCallScriptDto>;

export interface CreateCategoryDto {
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;

@Injectable()
export class CallScriptsService {
  constructor(
    @InjectRepository(CallScript)
    private readonly scriptRepo: TreeRepository<CallScript>,
    @InjectRepository(CallScriptCategory)
    private readonly categoryRepo: Repository<CallScriptCategory>,
  ) {}

  // Scripts
  async findAllScripts(activeOnly = false, categoryId?: string): Promise<CallScript[]> {
    const qb = this.scriptRepo.createQueryBuilder('script')
      .leftJoinAndSelect('script.category', 'category')
      .orderBy('script.sortOrder', 'ASC')
      .addOrderBy('script.updatedAt', 'DESC');

    if (categoryId) {
      qb.andWhere('script.categoryId = :categoryId', { categoryId });
    }

    if (activeOnly) {
      qb.andWhere('script.isActive = true');
    }

    return qb.getMany();
  }

  async findScriptTrees(): Promise<CallScript[]> {
    return this.scriptRepo.findTrees({ relations: ['category'] });
  }

  async findScript(id: string): Promise<CallScript> {
    const script = await this.scriptRepo.findOne({ 
      where: { id }, 
      relations: ['category'] 
    });
    if (!script) throw new NotFoundException('Call script not found');
    return script;
  }

  async createScript(dto: CreateCallScriptDto): Promise<CallScript> {
    const script = this.scriptRepo.create(dto);
    return this.scriptRepo.save(script);
  }

  async updateScript(id: string, dto: UpdateCallScriptDto): Promise<CallScript> {
    const script = await this.findScript(id);
    Object.assign(script, dto);
    return this.scriptRepo.save(script);
  }

  async deleteScript(id: string): Promise<{ deleted: boolean }> {
    const result = await this.scriptRepo.delete(id);
    return { deleted: (result.affected ?? 0) > 0 };
  }

  async toggleScript(id: string): Promise<CallScript> {
    const script = await this.findScript(id);
    script.isActive = !script.isActive;
    return this.scriptRepo.save(script);
  }

  async searchScripts(query: string, activeOnly = false): Promise<CallScript[]> {
    const qb = this.scriptRepo.createQueryBuilder('script')
      .leftJoinAndSelect('script.category', 'category');

    const like = `%${query.replace(/%/g, '\\%')}%`;
    qb.where('(script.title ILIKE :like OR script.description ILIKE :like)', { like });

    if (activeOnly) {
      qb.andWhere('script.isActive = true');
    }

    return qb.orderBy('script.sortOrder', 'ASC').getMany();
  }

  // Categories
  async findAllCategories(): Promise<CallScriptCategory[]> {
    return this.categoryRepo.find({ order: { sortOrder: 'ASC' } });
  }

  async findCategory(id: string): Promise<CallScriptCategory> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async createCategory(dto: CreateCategoryDto): Promise<CallScriptCategory> {
    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<CallScriptCategory> {
    const category = await this.findCategory(id);
    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async deleteCategory(id: string): Promise<{ deleted: boolean }> {
    const result = await this.categoryRepo.delete(id);
    return { deleted: (result.affected ?? 0) > 0 };
  }

  async reorderScripts(orderedIds: string[]): Promise<{ success: boolean }> {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if (id) {
        await this.scriptRepo.update(id, { sortOrder: i });
      }
    }
    return { success: true };
  }
}
