import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, CommentEntityType } from './entities/comment.entity';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

interface CommentFilters {
  entityType?: CommentEntityType;
  entityId?: string;
  userId?: string;
}

interface PaginatedComments {
  items: Comment[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>
  ) {}

  /**
   * Создать новый комментарий
   */
  async createComment(
    dto: CreateCommentDto,
    userId: string,
    userName: string
  ): Promise<Comment> {
    const comment = this.commentRepository.create({
      ...dto,
      userId,
      userName,
      isDeleted: false
    });

    return this.commentRepository.save(comment);
  }

  /**
   * Получить комментарии с фильтрацией и пагинацией
   */
  async getComments(
    filters: CommentFilters = {},
    page = 1,
    limit = 20
  ): Promise<PaginatedComments> {
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .where('comment.isDeleted = :isDeleted', { isDeleted: false });

    // Применяем фильтры
    if (filters.entityType) {
      queryBuilder.andWhere('comment.entityType = :entityType', {
        entityType: filters.entityType
      });
    }

    if (filters.entityId) {
      queryBuilder.andWhere('comment.entityId = :entityId', {
        entityId: filters.entityId
      });
    }

    if (filters.userId) {
      queryBuilder.andWhere('comment.userId = :userId', {
        userId: filters.userId
      });
    }

    // Сортировка по дате создания (новые сверху)
    queryBuilder.orderBy('comment.createdAt', 'DESC');

    // Пагинация
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * Получить комментарии для определенной сущности
   */
  async getCommentsForEntity(
    entityType: CommentEntityType,
    entityId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedComments> {
    return this.getComments({ entityType, entityId }, page, limit);
  }

  /**
   * Получить комментарий по ID
   */
  async getCommentById(id: string): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id, isDeleted: false }
    });

    if (!comment) {
      throw new NotFoundException(`Комментарий с ID ${id} не найден`);
    }

    return comment;
  }

  /**
   * Обновить комментарий
   */
  async updateComment(
    id: string,
    dto: UpdateCommentDto,
    userId: string
  ): Promise<Comment> {
    const comment = await this.getCommentById(id);

    if (String(comment.userId) !== String(userId)) {
      throw new ForbiddenException('Вы можете редактировать только свои комментарии');
    }

    // Обновляем только переданные поля
    Object.assign(comment, dto);

    return this.commentRepository.save(comment);
  }

  /**
   * Мягкое удаление комментария
   */
  async deleteComment(id: string, userId: string): Promise<void> {
    const comment = await this.getCommentById(id);

    // Проверяем, что пользователь может удалить этот комментарий
    if (String(comment.userId) !== String(userId)) {
      throw new ForbiddenException('Вы можете удалять только свои комментарии');
    }

    comment.isDeleted = true;
    await this.commentRepository.save(comment);
  }

  /**
   * Получить количество комментариев для сущности
   */
  async getCommentsCount(
    entityType: CommentEntityType,
    entityId: string
  ): Promise<number> {
    return this.commentRepository.count({
      where: {
        entityType,
        entityId,
        isDeleted: false
      }
    });
  }

  /**
   * Получить последние комментарии пользователя
   */
  async getUserRecentComments(
    userId: string,
    limit = 10
  ): Promise<Comment[]> {
    return this.commentRepository.find({
      where: {
        userId,
        isDeleted: false
      },
      order: {
        createdAt: 'DESC'
      },
      take: limit
    });
  }

  /**
   * Поиск комментариев по тексту
   */
  async searchComments(
    searchText: string,
    filters: CommentFilters = {},
    page = 1,
    limit = 20
  ): Promise<PaginatedComments> {
    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .where('comment.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('LOWER(comment.text) LIKE LOWER(:searchText)', {
        searchText: `%${searchText}%`
      });

    // Применяем дополнительные фильтры
    if (filters.entityType) {
      queryBuilder.andWhere('comment.entityType = :entityType', {
        entityType: filters.entityType
      });
    }

    if (filters.entityId) {
      queryBuilder.andWhere('comment.entityId = :entityId', {
        entityId: filters.entityId
      });
    }

    if (filters.userId) {
      queryBuilder.andWhere('comment.userId = :userId', {
        userId: filters.userId
      });
    }

    queryBuilder.orderBy('comment.createdAt', 'DESC');

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }
}