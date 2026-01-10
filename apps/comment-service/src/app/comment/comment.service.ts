import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { Comment, CommentEntityType } from './entities/comment.entity';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
  ) {}

  async create(dto: Partial<Comment>): Promise<Comment> {
    const comment = this.commentRepo.create(dto);
    
    // Extract mentions from content
    if (dto.content) {
      comment.mentions = this.extractMentions(dto.content);
    }
    
    return this.commentRepo.save(comment);
  }

  async findOne(id: number): Promise<Comment | null> {
    return this.commentRepo.findOne({ 
      where: { id },
      relations: ['replies'],
    });
  }

  async findAll(filter: {
    entityType?: CommentEntityType;
    entityId?: number;
    userId?: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: Comment[]; total: number; page: number; limit: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.commentRepo.createQueryBuilder('comment');

    if (filter.entityType) {
      qb.andWhere('comment.entityType = :entityType', { entityType: filter.entityType });
    }

    if (filter.entityId) {
      qb.andWhere('comment.entityId = :entityId', { entityId: filter.entityId });
    }

    if (filter.userId) {
      qb.andWhere('comment.authorId = :userId', { userId: filter.userId });
    }

    const [items, total] = await qb
      .orderBy('comment.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  async getCountForEntity(entityType: CommentEntityType, entityId: number): Promise<number> {
    return this.commentRepo.count({ where: { entityType, entityId } });
  }

  async getByUser(userId: number, limit = 50): Promise<Comment[]> {
    return this.commentRepo.find({
      where: { authorId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async update(id: number, dto: Partial<Comment>): Promise<Comment> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) {
      throw new NotFoundException(`Comment ${id} not found`);
    }
    
    // Update mentions if content changed
    if (dto.content) {
      dto.mentions = this.extractMentions(dto.content);
      dto.isEdited = true;
      dto.editedAt = new Date();
    }
    
    await this.commentRepo.update(id, dto);
    return this.commentRepo.findOneBy({ id }) as Promise<Comment>;
  }

  async delete(id: number): Promise<{ success: boolean }> {
    const result = await this.commentRepo.delete(id);
    return { success: (result.affected ?? 0) > 0 };
  }

  async getForEntity(entityType: CommentEntityType, entityId: number): Promise<Comment[]> {
    return this.commentRepo.find({
      where: { entityType, entityId, parentId: undefined },
      relations: ['replies'],
      order: { isPinned: 'DESC', createdAt: 'DESC' },
    });
  }

  async reply(parentId: number, dto: Partial<Comment>): Promise<Comment> {
    const parent = await this.commentRepo.findOneBy({ id: parentId });
    if (!parent) {
      throw new NotFoundException(`Parent comment ${parentId} not found`);
    }
    
    const reply = this.commentRepo.create({
      ...dto,
      entityType: parent.entityType,
      entityId: parent.entityId,
      parentId: parentId,
    });
    
    if (dto.content) {
      reply.mentions = this.extractMentions(dto.content);
    }
    
    return this.commentRepo.save(reply);
  }

  async getMentions(userId: number, limit = 50): Promise<Comment[]> {
    const comments = await this.commentRepo
      .createQueryBuilder('comment')
      .where(':userId = ANY(comment.mentions)', { userId })
      .orderBy('comment.createdAt', 'DESC')
      .take(limit)
      .getMany();
    
    return comments;
  }

  async pin(id: number): Promise<Comment> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) {
      throw new NotFoundException(`Comment ${id} not found`);
    }
    comment.isPinned = !comment.isPinned;
    return this.commentRepo.save(comment);
  }

  async addAttachment(id: number, attachment: { name: string; url: string; type: string; size: number }): Promise<Comment> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) {
      throw new NotFoundException(`Comment ${id} not found`);
    }
    comment.attachments = [...(comment.attachments || []), attachment];
    return this.commentRepo.save(comment);
  }

  async removeAttachment(id: number, attachmentUrl: string): Promise<Comment> {
    const comment = await this.commentRepo.findOneBy({ id });
    if (!comment) {
      throw new NotFoundException(`Comment ${id} not found`);
    }
    comment.attachments = (comment.attachments || []).filter(a => a.url !== attachmentUrl);
    return this.commentRepo.save(comment);
  }

  async search(query: string, entityType?: CommentEntityType): Promise<Comment[]> {
    const qb = this.commentRepo
      .createQueryBuilder('comment')
      .where('comment.content ILIKE :query', { query: `%${query}%` });
    
    if (entityType) {
      qb.andWhere('comment.entityType = :entityType', { entityType });
    }
    
    return qb
      .orderBy('comment.createdAt', 'DESC')
      .take(50)
      .getMany();
  }

  async getRecent(limit = 20, entityType?: CommentEntityType): Promise<Comment[]> {
    const qb = this.commentRepo.createQueryBuilder('comment');
    
    if (entityType) {
      qb.where('comment.entityType = :entityType', { entityType });
    }
    
    return qb
      .orderBy('comment.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getStats(): Promise<{
    totalComments: number;
    commentsByEntity: Record<string, number>;
    commentsToday: number;
    avgCommentsPerEntity: number;
  }> {
    const total = await this.commentRepo.count();
    
    const byEntity = await this.commentRepo
      .createQueryBuilder('comment')
      .select('comment.entityType', 'entityType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('comment.entityType')
      .getRawMany();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const commentsToday = await this.commentRepo
      .createQueryBuilder('comment')
      .where('comment.createdAt >= :today', { today })
      .getCount();
    
    const uniqueEntities = await this.commentRepo
      .createQueryBuilder('comment')
      .select('DISTINCT comment.entityType, comment.entityId')
      .getRawMany();
    
    return {
      totalComments: total,
      commentsByEntity: byEntity.reduce((acc, r) => {
        acc[r.entityType] = parseInt(r.count, 10);
        return acc;
      }, {}),
      commentsToday,
      avgCommentsPerEntity: uniqueEntities.length ? Math.round(total / uniqueEntities.length) : 0,
    };
  }

  private extractMentions(content: string): number[] {
    // Extract @mentions like @[userId:123] or @user:123
    const mentionPattern = /@\[?(?:userId:|user:)?(\d+)\]?/g;
    const mentions: number[] = [];
    let match;
    
    while ((match = mentionPattern.exec(content)) !== null) {
      if (match[1]) {
        mentions.push(parseInt(match[1], 10));
      }
    }
    
    return [...new Set(mentions)];
  }
}
