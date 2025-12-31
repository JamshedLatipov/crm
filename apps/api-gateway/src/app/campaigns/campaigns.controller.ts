import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { SERVICES, CAMPAIGN_PATTERNS } from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('campaigns')
@ApiBearerAuth('JWT-auth')
@Controller('campaigns')
@UseGuards(AuthGuard)
export class CampaignsController {
  constructor(
    @Inject(SERVICES.CAMPAIGN) private readonly campaignClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all campaigns', description: 'Retrieve all marketing campaigns' })
  @ApiResponse({ status: 200, description: 'List of campaigns' })
  async findAll(@Query() filter: Record<string, unknown>) {
    return firstValueFrom(
      this.campaignClient.send(CAMPAIGN_PATTERNS.GET_CAMPAIGNS, filter).pipe(timeout(5000)),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign details' })
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.campaignClient.send(CAMPAIGN_PATTERNS.GET_CAMPAIGN, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create campaign', description: 'Create a new marketing campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  async create(@Body() dto: Record<string, unknown>) {
    return firstValueFrom(
      this.campaignClient.send(CAMPAIGN_PATTERNS.CREATE_CAMPAIGN, dto).pipe(timeout(5000)),
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign updated' })
  async update(@Param('id') id: string, @Body() dto: Record<string, unknown>) {
    return firstValueFrom(
      this.campaignClient.send(CAMPAIGN_PATTERNS.UPDATE_CAMPAIGN, { id: parseInt(id, 10), ...dto }).pipe(timeout(5000)),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 204, description: 'Campaign deleted' })
  async remove(@Param('id') id: string) {
    return firstValueFrom(
      this.campaignClient.send(CAMPAIGN_PATTERNS.DELETE_CAMPAIGN, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start campaign', description: 'Start a campaign execution' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign started' })
  async start(@Param('id') id: string) {
    return firstValueFrom(
      this.campaignClient.send(CAMPAIGN_PATTERNS.START_CAMPAIGN, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }

  @Post(':id/pause')
  @ApiOperation({ summary: 'Pause campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign paused' })
  async pause(@Param('id') id: string) {
    return firstValueFrom(
      this.campaignClient.send(CAMPAIGN_PATTERNS.PAUSE_CAMPAIGN, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop campaign' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign stopped' })
  async stop(@Param('id') id: string) {
    return firstValueFrom(
      this.campaignClient.send(CAMPAIGN_PATTERNS.STOP_CAMPAIGN, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get campaign statistics' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  @ApiResponse({ status: 200, description: 'Campaign statistics' })
  async getStats(@Param('id') id: string) {
    return firstValueFrom(
      this.campaignClient.send(CAMPAIGN_PATTERNS.GET_STATS, { id: parseInt(id, 10) }).pipe(timeout(5000)),
    );
  }
}
