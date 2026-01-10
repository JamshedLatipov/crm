import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { COMMENT_PATTERNS } from '@crm/contracts';
import { CommentService } from './comment.service';
import { CommentEntityType } from './entities/comment.entity';

@ApiTags('Comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // ========== HTTP Endpoints ==========

  @Post()
  @ApiOperation({ summary: 'Create comment' })
  create(@Body() dto: any) {
    return this.commentService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all comments with filtering' })
  findAll(
    @Query('entityType') entityType?: CommentEntityType,
    @Query('entityId') entityId?: number,
    @Query('userId') userId?: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.commentService.findAll({ entityType, entityId, userId, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.commentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update comment' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.commentService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete comment' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.commentService.delete(id);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get comments for entity' })
  getForEntity(
    @Param('entityType') entityType: CommentEntityType,
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.commentService.getForEntity(entityType, entityId);
  }

  @Get('entity/:entityType/:entityId/count')
  @ApiOperation({ summary: 'Get comment count for entity' })
  getCountForEntity(
    @Param('entityType') entityType: CommentEntityType,
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return this.commentService.getCountForEntity(entityType, entityId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get comments by user' })
  getByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentService.getByUser(userId, limit);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to comment' })
  reply(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.commentService.reply(id, dto);
  }

  @Get('mentions/:userId')
  @ApiOperation({ summary: 'Get comments mentioning user' })
  getMentions(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit?: number,
  ) {
    return this.commentService.getMentions(userId, limit);
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Toggle pin comment' })
  pin(@Param('id', ParseIntPipe) id: number) {
    return this.commentService.pin(id);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Add attachment to comment' })
  addAttachment(@Param('id', ParseIntPipe) id: number, @Body() attachment: any) {
    return this.commentService.addAttachment(id, attachment);
  }

  @Delete(':id/attachments')
  @ApiOperation({ summary: 'Remove attachment from comment' })
  removeAttachment(@Param('id', ParseIntPipe) id: number, @Query('url') url: string) {
    return this.commentService.removeAttachment(id, url);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search comments' })
  search(@Query('q') query: string, @Query('entityType') entityType?: CommentEntityType) {
    return this.commentService.search(query, entityType);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent comments' })
  getRecent(@Query('limit') limit?: number, @Query('entityType') entityType?: CommentEntityType) {
    return this.commentService.getRecent(limit, entityType);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get comment statistics' })
  getStats() {
    return this.commentService.getStats();
  }

  // ========== RabbitMQ MessagePattern Handlers ==========

  @MessagePattern(COMMENT_PATTERNS.CREATE)
  handleCreate(@Payload() dto: any) {
    return this.commentService.create(dto);
  }

  @MessagePattern(COMMENT_PATTERNS.GET_ALL)
  handleGetAll(@Payload() filter: any) {
    return this.commentService.findAll(filter);
  }

  @MessagePattern(COMMENT_PATTERNS.GET_ONE)
  handleGetOne(@Payload() data: { id: number }) {
    return this.commentService.findOne(data.id);
  }

  @MessagePattern(COMMENT_PATTERNS.GET_COUNT_FOR_ENTITY)
  handleGetCountForEntity(@Payload() data: { entityType: CommentEntityType; entityId: number }) {
    return this.commentService.getCountForEntity(data.entityType, data.entityId);
  }

  @MessagePattern(COMMENT_PATTERNS.GET_BY_USER)
  handleGetByUser(@Payload() data: { userId: number; limit?: number }) {
    return this.commentService.getByUser(data.userId, data.limit);
  }

  @MessagePattern(COMMENT_PATTERNS.UPDATE)
  handleUpdate(@Payload() data: { id: number; dto: any }) {
    return this.commentService.update(data.id, data.dto);
  }

  @MessagePattern(COMMENT_PATTERNS.DELETE)
  handleDelete(@Payload() data: { id: number }) {
    return this.commentService.delete(data.id);
  }

  @MessagePattern(COMMENT_PATTERNS.GET_FOR_ENTITY)
  handleGetForEntity(@Payload() data: { entityType: CommentEntityType; entityId: number }) {
    return this.commentService.getForEntity(data.entityType, data.entityId);
  }

  @MessagePattern(COMMENT_PATTERNS.REPLY)
  handleReply(@Payload() data: { parentId: number; dto: any }) {
    return this.commentService.reply(data.parentId, data.dto);
  }

  @MessagePattern(COMMENT_PATTERNS.GET_MENTIONS)
  handleGetMentions(@Payload() data: { userId: number; limit?: number }) {
    return this.commentService.getMentions(data.userId, data.limit);
  }

  @MessagePattern(COMMENT_PATTERNS.PIN)
  handlePin(@Payload() data: { id: number }) {
    return this.commentService.pin(data.id);
  }

  @MessagePattern(COMMENT_PATTERNS.ADD_ATTACHMENT)
  handleAddAttachment(@Payload() data: { id: number; attachment: any }) {
    return this.commentService.addAttachment(data.id, data.attachment);
  }

  @MessagePattern(COMMENT_PATTERNS.REMOVE_ATTACHMENT)
  handleRemoveAttachment(@Payload() data: { id: number; url: string }) {
    return this.commentService.removeAttachment(data.id, data.url);
  }

  @MessagePattern(COMMENT_PATTERNS.SEARCH)
  handleSearch(@Payload() data: { query: string; entityType?: CommentEntityType }) {
    return this.commentService.search(data.query, data.entityType);
  }

  @MessagePattern(COMMENT_PATTERNS.GET_RECENT)
  handleGetRecent(@Payload() data: { limit?: number; entityType?: CommentEntityType }) {
    return this.commentService.getRecent(data.limit, data.entityType);
  }

  @MessagePattern(COMMENT_PATTERNS.GET_STATS)
  handleGetStats() {
    return this.commentService.getStats();
  }
}
