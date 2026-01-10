import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IvrNode, IvrActionType } from './entities/ivr-node.entity';

export interface CreateIvrNodeDto {
  name: string;
  parentId?: string | null;
  digit?: string | null;
  action: IvrActionType;
  payload?: string | null;
  queueName?: string | null;
  order?: number;
  timeoutMs?: number;
  ttsText?: string | null;
  backDigit?: string | null;
  allowEarlyDtmf?: boolean;
  repeatDigit?: string | null;
  rootDigit?: string | null;
}

export type UpdateIvrNodeDto = Partial<CreateIvrNodeDto>;

@Injectable()
export class IvrService {
  constructor(
    @InjectRepository(IvrNode) private readonly repo: Repository<IvrNode>,
  ) {}

  async create(dto: CreateIvrNodeDto): Promise<IvrNode> {
    const { ...rest } = dto as any;
    const node = this.repo.create({
      ...rest,
      order: dto.order ?? 0,
      timeoutMs: dto.timeoutMs ?? 5000,
      allowEarlyDtmf: dto.allowEarlyDtmf ?? true,
    } as Partial<IvrNode>) as IvrNode;
    return this.repo.save(node);
  }

  async update(id: string, dto: UpdateIvrNodeDto) {
    const node = await this.repo.findOne({ where: { id } });
    if (!node) throw new NotFoundException('IVR Node not found');
    Object.assign(node, dto);
    return this.repo.save(node);
  }

  async remove(id: string) {
    const result = await this.repo.delete(id);
    return { deleted: (result.affected ?? 0) > 0 };
  }

  async findOne(id: string) {
    const node = await this.repo.findOne({ where: { id } });
    if (!node) throw new NotFoundException('IVR Node not found');
    return node;
  }

  findRootTree() {
    return this.repo.find({ where: { parentId: undefined }, order: { order: 'ASC' } });
  }

  async findChildren(parentId: string) {
    const children = await this.repo.find({ where: { parentId }, order: { order: 'ASC' } });
    
    const childrenWithFlag = await Promise.all(
      children.map(async (child) => {
        const childCount = await this.repo.count({ where: { parentId: child.id } });
        return { ...child, hasChildren: childCount > 0 };
      })
    );
    
    return childrenWithFlag;
  }

  async getSubtree(id: string): Promise<IvrNode & { children: IvrNode[] }> {
    const node = await this.repo.findOne({ where: { id } });
    if (!node) throw new NotFoundException('IVR Node not found');
    const children = await this.findChildren(id);
    return Object.assign(node, { children });
  }

  async getFullTree(): Promise<any[]> {
    const roots = await this.findRootTree();
    
    const buildTree = async (nodes: IvrNode[]): Promise<any[]> => {
      return Promise.all(
        nodes.map(async (node) => {
          const children = await this.repo.find({ 
            where: { parentId: node.id }, 
            order: { order: 'ASC' } 
          });
          return {
            ...node,
            children: children.length > 0 ? await buildTree(children) : [],
          };
        })
      );
    };
    
    return buildTree(roots);
  }

  async reorder(nodeId: string, newOrder: number): Promise<IvrNode> {
    const node = await this.repo.findOne({ where: { id: nodeId } });
    if (!node) throw new NotFoundException('IVR Node not found');
    node.order = newOrder;
    return this.repo.save(node);
  }

  async moveNode(nodeId: string, newParentId: string | null): Promise<IvrNode> {
    const node = await this.repo.findOne({ where: { id: nodeId } });
    if (!node) throw new NotFoundException('IVR Node not found');
    
    node.parentId = newParentId;
    return this.repo.save(node);
  }

  async duplicateNode(nodeId: string): Promise<IvrNode> {
    const node = await this.repo.findOne({ where: { id: nodeId } });
    if (!node) throw new NotFoundException('IVR Node not found');
    
    const { id, ...nodeData } = node;
    const newNode = this.repo.create({
      ...nodeData,
      name: `${node.name} (copy)`,
    });
    
    return this.repo.save(newNode);
  }
}
