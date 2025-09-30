import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { Comment, CommentEntityType } from './entities/comment.entity';
import { JwtAuthGuard } from '../user/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../user/current-user.decorator';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый комментарий' })
  @ApiResponse({
    status: 201,
    description: 'Комментарий успешно создан',
    type: Comment
  })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async createComment(
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: CurrentUserPayload
  ): Promise<Comment> {
    return this.commentsService.createComment(dto, user.sub, user.username);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список комментариев с фильтрацией' })
  @ApiQuery({ name: 'entityType', required: false, enum: CommentEntityType })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Список комментариев получен успешно'
  })
  async getComments(
    @Query('entityType') entityType?: CommentEntityType,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20
  ) {
    const filters = { entityType, entityId, userId };
    return this.commentsService.getComments(filters, page, limit);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Получить комментарии для конкретной сущности' })
  @ApiParam({ name: 'entityType', enum: CommentEntityType })
  @ApiParam({ name: 'entityId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Комментарии для сущности получены успешно'
  })
  async getCommentsForEntity(
    @Param('entityType') entityType: CommentEntityType,
    @Param('entityId') entityId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20
  ) {
    return this.commentsService.getCommentsForEntity(entityType, entityId, page, limit);
  }

  @Get('entity/:entityType/:entityId/count')
  @ApiOperation({ summary: 'Получить количество комментариев для сущности' })
  @ApiParam({ name: 'entityType', enum: CommentEntityType })
  @ApiParam({ name: 'entityId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Количество комментариев получено успешно'
  })
  async getCommentsCount(
    @Param('entityType') entityType: CommentEntityType,
    @Param('entityId') entityId: string
  ): Promise<{ count: number }> {
    const count = await this.commentsService.getCommentsCount(entityType, entityId);
    return { count };
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск комментариев по тексту' })
  @ApiQuery({ name: 'q', type: String, description: 'Поисковый запрос' })
  @ApiQuery({ name: 'entityType', required: false, enum: CommentEntityType })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Результаты поиска получены успешно'
  })
  async searchComments(
    @Query('q') searchText: string,
    @Query('entityType') entityType?: CommentEntityType,
    @Query('entityId') entityId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20
  ) {
    const filters = { entityType, entityId };
    return this.commentsService.searchComments(searchText, filters, page, limit);
  }

  @Get('user/recent')
  @ApiOperation({ summary: 'Получить последние комментарии текущего пользователя' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Последние комментарии пользователя получены успешно'
  })
  async getUserRecentComments(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10
  ): Promise<Comment[]> {
    return this.commentsService.getUserRecentComments(user.sub, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить комментарий по ID' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Комментарий найден успешно',
    type: Comment
  })
  @ApiResponse({ status: 404, description: 'Комментарий не найден' })
  async getCommentById(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<Comment> {
    return this.commentsService.getCommentById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить комментарий' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Комментарий обновлен успешно',
    type: Comment
  })
  @ApiResponse({ status: 404, description: 'Комментарий не найден' })
  @ApiResponse({ status: 403, description: 'Нет прав для редактирования' })
  async updateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: CurrentUserPayload
  ): Promise<Comment> {
    return this.commentsService.updateComment(id, dto, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить комментарий' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Комментарий удален успешно'
  })
  @ApiResponse({ status: 404, description: 'Комментарий не найден' })
  @ApiResponse({ status: 403, description: 'Нет прав для удаления' })
  async deleteComment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload
  ): Promise<{ message: string }> {
    await this.commentsService.deleteComment(id, user.sub);
    return { message: 'Комментарий удален успешно' };
  }
}