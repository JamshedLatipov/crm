import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { CallScript } from './entities/call-script.entity';
import { CreateCallScriptDto, UpdateCallScriptDto } from './call-script.dto';

@Injectable()
export class CallScriptsService {
  constructor(
    @InjectRepository(CallScript)
    private readonly callScriptRepository: TreeRepository<CallScript>,
  ) {}

  async findAll(): Promise<CallScript[]> {
    return this.callScriptRepository.find({
      order: { sortOrder: 'ASC', updatedAt: 'DESC' },
    });
  }

  async findTrees(): Promise<CallScript[]> {
    return this.callScriptRepository.findTrees();
  }

  async findRoots(): Promise<CallScript[]> {
    return this.callScriptRepository.findRoots();
  }

  async findDescendants(script: CallScript): Promise<CallScript[]> {
    return this.callScriptRepository.findDescendants(script);
  }

  async findOne(id: string): Promise<CallScript | null> {
    return this.callScriptRepository.findOne({
      where: { id },
    });
  }

  async findOneWithChildren(id: string): Promise<CallScript | null> {
    return this.callScriptRepository.findOne({
      where: { id },
      relations: ['children'],
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
      order: { sortOrder: 'ASC', updatedAt: 'DESC' },
    });
  }

  async findActive(): Promise<CallScript[]> {
    return this.callScriptRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', updatedAt: 'DESC' },
    });
  }

  async findActiveTrees(): Promise<CallScript[]> {
    const roots = await this.callScriptRepository.findRoots();
    const activeRoots = roots.filter(root => root.isActive);

    const trees: CallScript[] = [];
    for (const root of activeRoots) {
      const tree = await this.callScriptRepository.findDescendantsTree(root, {
        relations: ['children'],
      });
      if (tree) {
        trees.push(tree);
      }
    }
    return trees;
  }

  async findTreesWithChildren(): Promise<CallScript[]> {
    const roots = await this.callScriptRepository.findRoots();
    return await this.callScriptRepository.find({
      where: { parentId: null },
      relations: ['children', 'children.children'],
      order: { sortOrder: 'ASC' },
    });
  }
}