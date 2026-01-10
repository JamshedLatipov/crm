import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, ParseIntPipe, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SERVICES, COMMENT_PATTERNS } from '@crm/contracts';
import { firstValueFrom } from 'rxjs';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
export class CommentsController {
  constructor(
    @Inject(SERVICES.COMMENT) private readonly commentClient: ClientProxy,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create comment' })
  create(@Body() dto: any) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.CREATE, dto));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.GET_ONE, { id }));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update comment' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.UPDATE, { id, dto }));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete comment' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.DELETE, { id }));
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get comments for entity' })
  getForEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseIntPipe) entityId: number,
  ) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.GET_FOR_ENTITY, { entityType, entityId }));
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Reply to comment' })
  reply(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.REPLY, { parentId: id, dto }));
  }

  @Get('mentions/:userId')
  @ApiOperation({ summary: 'Get comments mentioning user' })
  getMentions(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('limit') limit?: number,
  ) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.GET_MENTIONS, { userId, limit }));
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Toggle pin comment' })
  pin(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.PIN, { id }));
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Add attachment to comment' })
  addAttachment(@Param('id', ParseIntPipe) id: number, @Body() attachment: any) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.ADD_ATTACHMENT, { id, attachment }));
  }

  @Delete(':id/attachments')
  @ApiOperation({ summary: 'Remove attachment from comment' })
  removeAttachment(@Param('id', ParseIntPipe) id: number, @Query('url') url: string) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.REMOVE_ATTACHMENT, { id, url }));
  }

  @Get('search')
  @ApiOperation({ summary: 'Search comments' })
  search(@Query('q') query: string, @Query('entityType') entityType?: string) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.SEARCH, { query, entityType }));
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent comments' })
  getRecent(@Query('limit') limit?: number, @Query('entityType') entityType?: string) {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.GET_RECENT, { limit, entityType }));
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get comment statistics' })
  getStats() {
    return firstValueFrom(this.commentClient.send(COMMENT_PATTERNS.GET_STATS, {}));
  }
}
