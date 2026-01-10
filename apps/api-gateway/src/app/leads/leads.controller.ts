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
  LEAD_PATTERNS,
  CreateLeadDto,
  UpdateLeadDto,
  LeadFilterDto,
} from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';
import { LeadResponseDto, CreateLeadRequestDto, UpdateLeadRequestDto, LeadFilterRequestDto, BulkAssignRequestDto } from '../dto';

@ApiTags('leads')
@ApiBearerAuth('JWT-auth')
@Controller('leads')
@UseGuards(AuthGuard)
export class LeadsController {
  constructor(
    @Inject(SERVICES.LEAD) private readonly leadClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all leads', description: 'Retrieve leads with optional filtering and pagination' })
  @ApiResponse({ status: 200, description: 'List of leads', type: [LeadResponseDto] })
  async findAll(@Query() filter: LeadFilterDto) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.GET_LEADS, filter).pipe(timeout(5000)),
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get lead statistics', description: 'Get aggregate statistics about leads' })
  @ApiResponse({ status: 200, description: 'Lead statistics' })
  async getStats() {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.GET_STATS, {}).pipe(timeout(5000)),
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search leads', description: 'Full-text search across lead fields' })
  @ApiQuery({ name: 'q', description: 'Search query', required: true })
  @ApiQuery({ name: 'page', description: 'Page number', required: false })
  @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
  @ApiResponse({ status: 200, description: 'Search results', type: [LeadResponseDto] })
  async search(@Query('q') query: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.SEARCH, { query, page, limit }).pipe(timeout(5000)),
    );
  }

  @Get('high-value')
  @ApiOperation({ summary: 'Get high-value leads', description: 'Retrieve leads above a certain value threshold' })
  @ApiQuery({ name: 'minValue', description: 'Minimum estimated value', required: false })
  @ApiResponse({ status: 200, description: 'High-value leads', type: [LeadResponseDto] })
  async getHighValue(@Query('minValue') minValue = 10000) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.GET_HIGH_VALUE, { minValue }).pipe(timeout(5000)),
    );
  }

  @Get('stale')
  @ApiOperation({ summary: 'Get stale leads', description: 'Retrieve leads without activity for specified days' })
  @ApiQuery({ name: 'days', description: 'Number of days of inactivity', required: false })
  @ApiResponse({ status: 200, description: 'Stale leads', type: [LeadResponseDto] })
  async getStale(@Query('days') days = 7) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.GET_STALE, { days }).pipe(timeout(5000)),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID', description: 'Retrieve a specific lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead found', type: LeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.GET_LEAD, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create lead', description: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created', type: LeadResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreateLeadDto) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CREATE_LEAD, dto).pipe(timeout(5000)),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead', description: 'Update an existing lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead updated', type: LeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.UPDATE_LEAD, { id: parseInt(id, 10), dto }).pipe(timeout(5000)),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete lead', description: 'Delete a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 204, description: 'Lead deleted' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async remove(@Param('id') id: string) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.DELETE_LEAD, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign lead', description: 'Assign lead to a user' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead assigned', type: LeadResponseDto })
  async assign(@Param('id') id: string, @Body('assigneeId') assigneeId: number) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.ASSIGN_LEAD, { id: parseInt(id, 10), assigneeId }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/score')
  @ApiOperation({ summary: 'Update lead score', description: 'Set the score for a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Score updated', type: LeadResponseDto })
  async updateScore(@Param('id') id: string, @Body('score') score: number) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.SCORE_LEAD, { id: parseInt(id, 10), score }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change lead status', description: 'Update the status of a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Status updated', type: LeadResponseDto })
  async changeStatus(@Param('id') id: string, @Body('status') status: string) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CHANGE_STATUS, { id: parseInt(id, 10), status }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/qualify')
  @ApiOperation({ summary: 'Qualify/disqualify lead', description: 'Mark lead as qualified or disqualified' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Lead qualification updated', type: LeadResponseDto })
  async qualify(@Param('id') id: string, @Body('qualified') qualified: boolean) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.QUALIFY, { id: parseInt(id, 10), qualified }).pipe(timeout(5000)),
    );
  }

  @Patch(':id/contact')
  @ApiOperation({ summary: 'Update last contact', description: 'Update the last contact timestamp for a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Last contact updated', type: LeadResponseDto })
  async updateLastContact(@Param('id') id: string) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.UPDATE_LAST_CONTACT, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Add tags to lead', description: 'Add one or more tags to a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Tags added', type: LeadResponseDto })
  async addTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.ADD_TAGS, { id: parseInt(id, 10), tags }).pipe(timeout(5000)),
    );
  }

  @Delete(':id/tags')
  @ApiOperation({ summary: 'Remove tags from lead', description: 'Remove one or more tags from a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Tags removed', type: LeadResponseDto })
  async removeTags(@Param('id') id: string, @Body('tags') tags: string[]) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.REMOVE_TAGS, { id: parseInt(id, 10), tags }).pipe(timeout(5000)),
    );
  }

  @Post(':id/follow-up')
  @ApiOperation({ summary: 'Schedule follow-up', description: 'Schedule a follow-up date for a lead' })
  @ApiParam({ name: 'id', description: 'Lead ID' })
  @ApiResponse({ status: 200, description: 'Follow-up scheduled', type: LeadResponseDto })
  async scheduleFollowUp(@Param('id') id: string, @Body('followUpDate') followUpDate: Date) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.SCHEDULE_FOLLOW_UP, { id: parseInt(id, 10), followUpDate }).pipe(timeout(5000)),
    );
  }

  @Patch('bulk-assign')
  @ApiOperation({ summary: 'Bulk assign leads', description: 'Assign multiple leads to a user' })
  @ApiResponse({ status: 200, description: 'Leads assigned' })
  async bulkAssign(@Body() body: { leadIds: number[]; assigneeId: number }) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.BULK_ASSIGN, body).pipe(timeout(10000)),
    );
  }

  // ========== Lead Scoring Endpoints ==========

  @Get('scoring/rules')
  @ApiOperation({ summary: 'Get scoring rules' })
  async getScoringRules() {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.SCORING_GET_RULES, {}).pipe(timeout(5000)),
    );
  }

  @Get('scoring/rules/:id')
  @ApiOperation({ summary: 'Get scoring rule by ID' })
  async getScoringRule(@Param('id') id: string) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.SCORING_GET_RULE, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }

  @Post('scoring/rules')
  @ApiOperation({ summary: 'Create scoring rule' })
  async createScoringRule(@Body() dto: any) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.SCORING_CREATE_RULE, dto).pipe(timeout(5000)),
    );
  }

  @Put('scoring/rules/:id')
  @ApiOperation({ summary: 'Update scoring rule' })
  async updateScoringRule(@Param('id') id: string, @Body() dto: any) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.SCORING_UPDATE_RULE, { id: parseInt(id, 10), dto }).pipe(timeout(5000)),
    );
  }

  @Delete('scoring/rules/:id')
  @ApiOperation({ summary: 'Delete scoring rule' })
  async deleteScoringRule(@Param('id') id: string) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.SCORING_DELETE_RULE, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }

  @Post('scoring/calculate/:leadId')
  @ApiOperation({ summary: 'Calculate score for a lead' })
  async calculateScore(@Param('leadId') leadId: string) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.SCORING_CALCULATE, { leadId: parseInt(leadId, 10) }).pipe(timeout(5000)),
    );
  }

  @Post('scoring/bulk-calculate')
  @ApiOperation({ summary: 'Bulk calculate lead scores' })
  async bulkCalculateScores(@Body() dto: { leadIds?: number[]; forceRecalculate?: boolean }) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.SCORING_BULK_CALCULATE, dto).pipe(timeout(30000)),
    );
  }

  @Get('scoring/hot-leads')
  @ApiOperation({ summary: 'Get hot leads' })
  async getHotLeads(@Query('limit') limit = 50) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.SCORING_GET_HOT_LEADS, { limit }).pipe(timeout(5000)),
    );
  }

  // ========== Lead Distribution Endpoints ==========

  @Get('distribution/rules')
  @ApiOperation({ summary: 'Get distribution rules' })
  async getDistributionRules() {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.DISTRIBUTION_GET_RULES, {}).pipe(timeout(5000)),
    );
  }

  @Post('distribution/rules')
  @ApiOperation({ summary: 'Create distribution rule' })
  async createDistributionRule(@Body() dto: any) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.DISTRIBUTION_CREATE_RULE, dto).pipe(timeout(5000)),
    );
  }

  @Put('distribution/rules/:id')
  @ApiOperation({ summary: 'Update distribution rule' })
  async updateDistributionRule(@Param('id') id: string, @Body() dto: any) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.DISTRIBUTION_UPDATE_RULE, { id: parseInt(id, 10), dto }).pipe(timeout(5000)),
    );
  }

  @Delete('distribution/rules/:id')
  @ApiOperation({ summary: 'Delete distribution rule' })
  async deleteDistributionRule(@Param('id') id: string) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.DISTRIBUTION_DELETE_RULE, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }

  @Post('distribution/auto-assign')
  @ApiOperation({ summary: 'Auto-assign lead based on rules' })
  async autoAssign(@Body() dto: { leadId: number }) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.DISTRIBUTION_AUTO_ASSIGN, dto).pipe(timeout(5000)),
    );
  }

  @Post('distribution/reassign')
  @ApiOperation({ summary: 'Reassign lead to different user' })
  async reassign(@Body() dto: { leadId: number; userId: number; reason?: string }) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.DISTRIBUTION_REASSIGN, dto).pipe(timeout(5000)),
    );
  }

  @Get('distribution/workload')
  @ApiOperation({ summary: 'Get workload distribution' })
  async getWorkload() {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.DISTRIBUTION_GET_WORKLOAD, {}).pipe(timeout(5000)),
    );
  }

  // ========== Lead Capture Endpoints ==========

  @Post('capture/website-form')
  @ApiOperation({ summary: 'Capture lead from website form' })
  async captureWebsiteForm(@Body() dto: any) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CAPTURE_WEBSITE_FORM, { dto }).pipe(timeout(5000)),
    );
  }

  @Post('capture/social-media/:platform')
  @ApiOperation({ summary: 'Capture lead from social media' })
  async captureSocialMedia(@Param('platform') platform: string, @Body() dto: any) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CAPTURE_SOCIAL_MEDIA, { platform, dto }).pipe(timeout(5000)),
    );
  }

  @Post('capture/webhook/:source')
  @ApiOperation({ summary: 'Generic webhook for lead capture' })
  async captureWebhook(@Param('source') source: string, @Body() dto: any) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CAPTURE_WEBHOOK, { source, dto }).pipe(timeout(5000)),
    );
  }

  @Post('capture/zapier')
  @ApiOperation({ summary: 'Capture from Zapier' })
  async captureZapier(@Body() dto: any) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CAPTURE_ZAPIER, dto).pipe(timeout(5000)),
    );
  }

  @Post('capture/facebook')
  @ApiOperation({ summary: 'Capture from Facebook Lead Ads' })
  async captureFacebook(@Body() dto: any) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CAPTURE_FACEBOOK, dto).pipe(timeout(5000)),
    );
  }

  @Post('capture/google-ads')
  @ApiOperation({ summary: 'Capture from Google Ads' })
  async captureGoogleAds(@Body() dto: any) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CAPTURE_GOOGLE_ADS, dto).pipe(timeout(5000)),
    );
  }

  @Get('capture/configs')
  @ApiOperation({ summary: 'Get capture configurations' })
  async getCaptureConfigs() {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CAPTURE_GET_CONFIGS, {}).pipe(timeout(5000)),
    );
  }

  @Post('capture/configs')
  @ApiOperation({ summary: 'Create capture configuration' })
  async createCaptureConfig(@Body() dto: any) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CAPTURE_CREATE_CONFIG, dto).pipe(timeout(5000)),
    );
  }

  @Get('capture/history')
  @ApiOperation({ summary: 'Get capture history' })
  async getCaptureHistory(@Query('limit') limit?: number, @Query('source') source?: string) {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CAPTURE_GET_HISTORY, { limit, source }).pipe(timeout(5000)),
    );
  }

  @Get('capture/stats')
  @ApiOperation({ summary: 'Get capture statistics' })
  async getCaptureStats() {
    return firstValueFrom(
      this.leadClient.send(LEAD_PATTERNS.CAPTURE_GET_STATS, {}).pipe(timeout(5000)),
    );
  }
}
