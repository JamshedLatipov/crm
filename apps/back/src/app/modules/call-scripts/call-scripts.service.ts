import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { CallScript } from './entities/call-script.entity';
import { CreateCallScriptDto, UpdateCallScriptDto } from './call-script.dto';

@Injectable()
export class CallScriptsService {
  constructor(
    @InjectRepository(CallScript)
    private readonly callScriptRepository: TreeRepository<CallScript>
  ) {}

  async findAll(): Promise<CallScript[]> {
    return this.callScriptRepository.find({
      order: { sortOrder: 'ASC', updatedAt: 'DESC' },
      relations: ['category'],
    });
  }

  async findTrees(): Promise<CallScript[]> {
    return this.callScriptRepository.findTrees({
      relations: ['category'],
    });
  }

  /**
   * Return full trees optionally filtered by active state.
   * If `activeOnly` is true, nodes are included only if they are active or have active descendants.
   */
  async findTreesFiltered(
    activeOnly = false,
    q?: string,
    categoryId?: string
  ): Promise<CallScript[]> {
    const qb = this.callScriptRepository.createQueryBuilder('script');
    
    // Load category relation
    qb.leftJoinAndSelect('script.category', 'category');

    if (categoryId) {
      qb.andWhere('script.categoryId = :categoryId', { categoryId });
    }

    if (activeOnly) {
      qb.andWhere('script.isActive = true');
    }

    if (q) {
      const like = `%${q.replace(/%/g, '\\%')}%`;
      // Use ILIKE for case-insensitive search on Postgres
      qb.andWhere(
        '(script.title ILIKE :like OR script.description ILIKE :like)',
        { like }
      );
    }

    qb.orderBy('script.sortOrder', 'ASC').addOrderBy(
      'script.updatedAt',
      'DESC'
    );
    const all = await qb.getMany();

    // Map nodes by id and ensure children arrays
    const map = new Map<string, CallScript & { children: CallScript[] }>();
    for (const item of all) {
      map.set(item.id, { ...item, children: [] });
    }

    // Attach children to parents
    const roots: (CallScript & { children: CallScript[] })[] = [];
    for (const node of map.values()) {
      if (node.parentId) {
        const parent = map.get(node.parentId);
        if (parent) {
          parent.children.push(node);
          continue;
        }
      }
      roots.push(node);
    }

    const pruneInactive = (
      node: CallScript & { children: CallScript[] }
    ): CallScript | null => {
      const keptChildren: CallScript[] = [];
      for (const c of node.children) {
        const kept = pruneInactive(c as any);
        if (kept) keptChildren.push(kept as CallScript);
      }
      const nodeIsActive = !!(node as CallScript).isActive;
      if (nodeIsActive || keptChildren.length > 0) {
        const cloned: any = { ...node };
        cloned.children = keptChildren;
        return cloned as CallScript;
      }
      return null;
    };

    if (!activeOnly) {
      return roots as CallScript[];
    }

    const result: CallScript[] = [];
    for (const r of roots) {
      const kept = pruneInactive(r);
      if (kept) result.push(kept);
    }
    return result;
  }

  async findRoots(): Promise<CallScript[]> {
    return this.callScriptRepository.findRoots({
      relations: ['category'],
    });
  }

  async findDescendants(script: CallScript): Promise<CallScript[]> {
    return this.callScriptRepository.findDescendants(script);
  }

  async findOne(id: string): Promise<CallScript | null> {
    return this.callScriptRepository.findOne({
      where: { id },
      relations: ['category'],
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

  async update(
    id: string,
    updateCallScriptDto: UpdateCallScriptDto
  ): Promise<CallScript | null> {
    await this.callScriptRepository.update(id, updateCallScriptDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.callScriptRepository.delete(id);
  }

  async findByCategory(categoryId: string): Promise<CallScript[]> {
    return this.callScriptRepository.find({
      where: { categoryId, isActive: true },
      relations: ['category'],
      order: { sortOrder: 'ASC', updatedAt: 'DESC' },
    });
  }

  async findActive(): Promise<CallScript[]> {
    return this.callScriptRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', updatedAt: 'DESC' },
      relations: ['category'],
    });
  }

  async findActiveTrees(): Promise<CallScript[]> {
    // Fetch active root scripts and include their children in the same query.
    // Using relations here ensures `children` arrays are present in the returned trees
    // (similar to `findTreesWithChildren`), avoiding cases where descendants are missing.
    return await this.callScriptRepository.find({
      where: { parentId: null, isActive: true },
      relations: ['children', 'children.children', 'category'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findTreesWithChildren(): Promise<CallScript[]> {
    const roots = await this.callScriptRepository.findRoots();
    return await this.callScriptRepository.find({
      where: { parentId: null },
      relations: ['children', 'children.children', 'category'],
      order: { sortOrder: 'ASC' },
    });
  }
}
