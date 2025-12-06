import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { IvrNode, IvrActionType } from './entities/ivr-node.entity';
import { AriService } from '../ari/ari.service';

export interface CreateIvrNodeDto {
  name: string;
  parentId?: string | null;
  digit?: string | null;
  action: IvrActionType;
  payload?: string | null;
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
    private readonly ari: AriService,
  ) {}

  create(dto: CreateIvrNodeDto) {
    // Ensure any incoming 'id' is ignored so the database can generate it
    const { id: _incomingId, ...rest } = dto as any;
    const node = this.repo.create({
      ...rest,
      order: dto.order ?? 0,
      timeoutMs: dto.timeoutMs ?? 5000,
      allowEarlyDtmf: dto.allowEarlyDtmf ?? true,
    });
    return this.repo.save(node);
  }

  async update(id: string, dto: UpdateIvrNodeDto) {
    const node = await this.repo.findOne({ where: { id } });
    if (!node) throw new NotFoundException('Node not found');
    Object.assign(node, dto);
  if (dto.allowEarlyDtmf !== undefined) node.allowEarlyDtmf = dto.allowEarlyDtmf;
    return this.repo.save(node);
  }

  async remove(id: string) {
    await this.repo.delete(id);
    return { deleted: true };
  }

  findRootTree() {
    return this.repo.find({ where: { parentId: IsNull() }, order: { order: 'ASC' } });
  }

  async findChildren(parentId: string) {
    const children = await this.repo.find({ where: { parentId }, order: { order: 'ASC' } });
    
    // Добавляем информацию о наличии дочерних элементов для каждого child
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
    if (!node) throw new NotFoundException('Node not found');
    const children = await this.findChildren(id);
  return Object.assign(node, { children });
  }

  // Placeholder: Execution via ARI would locate node by name or payload and perform actions.
  async executeNode(nodeId: string) {
    const node = await this.repo.findOne({ where: { id: nodeId } });
    if (!node) throw new NotFoundException('Node not found');
    // Future: use this.ari.client.playback / dial etc. For now just return.
    return { executed: true, node };
  }
}
