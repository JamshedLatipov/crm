import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  SERVICES,
  DEAL_PATTERNS,
  PIPELINE_PATTERNS,
  CreateDealDto,
  UpdateDealDto,
  DealFilterDto,
} from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';
import { DealResponseDto, DealPipelineResponseDto } from '../dto';

@ApiTags('deals')
@ApiBearerAuth('JWT-auth')
@Controller('deals')
@UseGuards(AuthGuard)
export class DealsController {
  constructor(
    @Inject(SERVICES.DEAL) private readonly dealClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all deals', description: 'Retrieve deals with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'List of deals', type: [DealResponseDto] })
  async findAll(@Query() filter: DealFilterDto) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.FIND_ALL, filter).pipe(timeout(5000)),
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get deal statistics', description: 'Aggregate statistics about deals' })
  @ApiResponse({ status: 200, description: 'Deal statistics' })
  async getStats() {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_STATS, {}).pipe(timeout(5000)),
    );
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Get revenue forecast', description: 'Forecast revenue for a date range' })
  @ApiQuery({ name: 'startDate', description: 'Start date (YYYY-MM-DD)', required: true })
  @ApiQuery({ name: 'endDate', description: 'End date (YYYY-MM-DD)', required: true })
  @ApiResponse({ status: 200, description: 'Revenue forecast' })
  async getForecast(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_FORECAST, { startDate, endDate }).pipe(timeout(5000)),
    );
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue deals', description: 'Retrieve deals past their expected close date' })
  @ApiResponse({ status: 200, description: 'Overdue deals', type: [DealResponseDto] })
  async getOverdue() {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_OVERDUE, {}).pipe(timeout(5000)),
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search deals', description: 'Search deals by title' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiResponse({ status: 200, description: 'Search results', type: [DealResponseDto] })
  async search(@Query('q') query: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.SEARCH, { query }).pipe(timeout(5000)),
    );
  }

  @Get('by-stage/:stageId')
  @ApiOperation({ summary: 'Get deals by stage', description: 'Retrieve deals in a specific pipeline stage' })
  @ApiParam({ name: 'stageId', description: 'Stage ID' })
  @ApiResponse({ status: 200, description: 'Deals in stage', type: [DealResponseDto] })
  async getByStage(@Param('stageId') stageId: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_BY_STAGE, { stageId }).pipe(timeout(5000)),
    );
  }

  @Get('by-company/:companyId')
  @ApiOperation({ summary: 'Get deals by company', description: 'Retrieve deals associated with a company' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company deals', type: [DealResponseDto] })
  async getByCompany(@Param('companyId') companyId: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_BY_COMPANY, { companyId }).pipe(timeout(5000)),
    );
  }

  @Get('by-contact/:contactId')
  @ApiOperation({ summary: 'Get deals by contact', description: 'Retrieve deals associated with a contact' })
  @ApiParam({ name: 'contactId', description: 'Contact ID' })
  @ApiResponse({ status: 200, description: 'Contact deals', type: [DealResponseDto] })
  async getByContact(@Param('contactId') contactId: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_BY_CONTACT, { contactId }).pipe(timeout(5000)),
    );
  }

  @Get('by-lead/:leadId')
  @ApiOperation({ summary: 'Get deals by lead', description: 'Retrieve deals associated with a lead' })
  @ApiParam({ name: 'leadId', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead deals', type: [DealResponseDto] })
  async getByLead(@Param('leadId') leadId: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_BY_LEAD, { leadId }).pipe(timeout(5000)),
    );
  }

  @Get('history/stage-movement-stats')
  @ApiOperation({ summary: 'Get stage movement statistics', description: 'Get statistics about deal stage movements' })
  @ApiQuery({ name: 'dateFrom', description: 'Start date', required: false })
  @ApiQuery({ name: 'dateTo', description: 'End date', required: false })
  @ApiResponse({ status: 200, description: 'Stage movement stats' })
  async getStageMovementStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_STAGE_MOVEMENT_STATS, { dateFrom, dateTo }).pipe(timeout(5000)),
    );
  }

  @Get('history/most-active')
  @ApiOperation({ summary: 'Get most active deals', description: 'Get deals with most activity/changes' })
  @ApiQuery({ name: 'limit', description: 'Max number of results', required: false })
  @ApiQuery({ name: 'dateFrom', description: 'Start date', required: false })
  @ApiQuery({ name: 'dateTo', description: 'End date', required: false })
  @ApiResponse({ status: 200, description: 'Most active deals' })
  async getMostActive(
    @Query('limit') limit?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_MOST_ACTIVE, { limit, dateFrom, dateTo }).pipe(timeout(5000)),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal by ID', description: 'Retrieve a specific deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Deal found', type: DealResponseDto })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.FIND_ONE, { id }).pipe(timeout(5000)),
    );
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get deal history', description: 'Retrieve deal change history' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
  @ApiResponse({ status: 200, description: 'Deal history' })
  async getHistory(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_HISTORY, { dealId: id, page, limit }).pipe(timeout(5000)),
    );
  }

  @Get(':id/history/stats')
  @ApiOperation({ summary: 'Get deal history statistics', description: 'Get statistics about deal changes' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiQuery({ name: 'dateFrom', description: 'Start date', required: false })
  @ApiQuery({ name: 'dateTo', description: 'End date', required: false })
  @ApiResponse({ status: 200, description: 'History statistics' })
  async getHistoryStats(
    @Param('id') id: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_HISTORY_STATS, { id, dateFrom, dateTo }).pipe(timeout(5000)),
    );
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: 'Get deal assignments', description: 'Get current assignments for a deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Deal assignments' })
  async getAssignments(@Param('id') id: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.GET_ASSIGNMENTS, { id }).pipe(timeout(5000)),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create deal', description: 'Create a new deal' })
  @ApiResponse({ status: 201, description: 'Deal created', type: DealResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreateDealDto) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.CREATE, { dto }).pipe(timeout(5000)),
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update deal', description: 'Update an existing deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Deal updated', type: DealResponseDto })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.UPDATE, { id, dto }).pipe(timeout(5000)),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete deal', description: 'Delete a deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 204, description: 'Deal deleted' })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  async remove(@Param('id') id: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.REMOVE, { id }).pipe(timeout(5000)),
    );
  }

  @Post(':id/win')
  @Patch(':id/win')
  @ApiOperation({ summary: 'Win deal', description: 'Mark deal as won' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Deal marked as won', type: DealResponseDto })
  async winDeal(@Param('id') id: string, @Body('amount') amount?: number) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.WIN, { id, amount }).pipe(timeout(5000)),
    );
  }

  @Post(':id/lose')
  @Patch(':id/lose')
  @ApiOperation({ summary: 'Lose deal', description: 'Mark deal as lost' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Deal marked as lost', type: DealResponseDto })
  async loseDeal(@Param('id') id: string, @Body('reason') reason?: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.LOSE, { id, reason }).pipe(timeout(5000)),
    );
  }

  @Post(':id/reopen')
  @ApiOperation({ summary: 'Reopen deal', description: 'Reopen a closed deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Deal reopened', type: DealResponseDto })
  async reopenDeal(@Param('id') id: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.REOPEN, { id }).pipe(timeout(5000)),
    );
  }

  @Post(':id/move-to-stage')
  @Patch(':id/move-stage')
  @ApiOperation({ summary: 'Move deal to stage', description: 'Move deal to a different pipeline stage' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Deal moved', type: DealResponseDto })
  async moveToStage(@Param('id') id: string, @Body('stageId') stageId: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.MOVE_STAGE, { id, stageId }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/probability')
  @ApiOperation({ summary: 'Update deal probability', description: 'Update the win probability for a deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Probability updated', type: DealResponseDto })
  async updateProbability(@Param('id') id: string, @Body('probability') probability: number) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.UPDATE_PROBABILITY, { id, probability }).pipe(timeout(5000)),
    );
  }

  @Post(':id/link-contact')
  @Patch(':id/link-contact')
  @ApiOperation({ summary: 'Link contact to deal', description: 'Associate a contact with the deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Contact linked' })
  async linkContact(@Param('id') id: string, @Body('contactId') contactId: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.LINK_CONTACT, { id, contactId }).pipe(timeout(5000)),
    );
  }

  @Post(':id/link-company')
  @Patch(':id/link-company')
  @ApiOperation({ summary: 'Link company to deal', description: 'Associate a company with the deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Company linked' })
  async linkCompany(@Param('id') id: string, @Body('companyId') companyId: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.LINK_COMPANY, { id, companyId }).pipe(timeout(5000)),
    );
  }

  @Post(':id/link-lead')
  @Patch(':id/link-lead')
  @ApiOperation({ summary: 'Link lead to deal', description: 'Associate a lead with the deal' })
  @ApiParam({ name: 'id', description: 'Deal ID' })
  @ApiResponse({ status: 200, description: 'Lead linked' })
  async linkLead(@Param('id') id: string, @Body('leadId') leadId: string) {
    return firstValueFrom(
      this.dealClient.send(DEAL_PATTERNS.LINK_LEAD, { id, leadId }).pipe(timeout(5000)),
    );
  }
}

@ApiTags('pipeline')
@ApiBearerAuth('JWT-auth')
@Controller('pipeline')
@UseGuards(AuthGuard)
export class PipelineController {
  constructor(
    @Inject(SERVICES.DEAL) private readonly dealClient: ClientProxy,
  ) {}

  @Get('stages')
  @ApiOperation({ summary: 'Get all pipeline stages', description: 'Retrieve all pipeline stages' })
  @ApiResponse({ status: 200, description: 'List of pipeline stages', type: [DealPipelineResponseDto] })
  async findAllStages() {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.FIND_ALL_STAGES, {}).pipe(timeout(5000)),
    );
  }

  @Get('stages/:id')
  @ApiOperation({ summary: 'Get stage by ID', description: 'Retrieve a specific pipeline stage' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  @ApiResponse({ status: 200, description: 'Stage found' })
  async findOneStage(@Param('id') id: string) {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.FIND_ONE_STAGE, { id }).pipe(timeout(5000)),
    );
  }

  @Post('stages')
  @ApiOperation({ summary: 'Create pipeline stage', description: 'Create a new pipeline stage' })
  @ApiResponse({ status: 201, description: 'Stage created' })
  async createStage(@Body() dto: { name: string; position?: number; probability?: number }) {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.CREATE_STAGE, dto).pipe(timeout(5000)),
    );
  }

  @Put('stages/:id')
  @ApiOperation({ summary: 'Update pipeline stage', description: 'Update an existing pipeline stage' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  @ApiResponse({ status: 200, description: 'Stage updated' })
  async updateStage(@Param('id') id: string, @Body() dto: any) {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.UPDATE_STAGE, { id, dto }).pipe(timeout(5000)),
    );
  }

  @Delete('stages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete pipeline stage', description: 'Delete a pipeline stage' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  @ApiResponse({ status: 204, description: 'Stage deleted' })
  async removeStage(@Param('id') id: string) {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.REMOVE_STAGE, { id }).pipe(timeout(5000)),
    );
  }

  @Post('stages/reorder')
  @ApiOperation({ summary: 'Reorder pipeline stages', description: 'Change the order of pipeline stages' })
  @ApiResponse({ status: 200, description: 'Stages reordered' })
  async reorderStages(@Body('stageIds') stageIds: string[]) {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.REORDER_STAGES, { stageIds }).pipe(timeout(5000)),
    );
  }
}
