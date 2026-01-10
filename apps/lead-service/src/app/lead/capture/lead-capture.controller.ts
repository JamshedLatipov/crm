import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseIntPipe, Headers, Ip } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LEAD_PATTERNS } from '@crm/contracts';
import { LeadCaptureService } from './lead-capture.service';

@ApiTags('Lead Capture')
@Controller('lead-capture')
export class LeadCaptureController {
  constructor(private readonly captureService: LeadCaptureService) {}

  // ========== HTTP Endpoints ==========

  @Post('website-form')
  @ApiOperation({ summary: 'Capture lead from website form' })
  captureWebsiteForm(
    @Body() dto: any,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Headers('referer') referrer: string,
  ) {
    return this.captureService.captureWebsiteForm(dto, { ipAddress, userAgent, referrer });
  }

  @Post('social-media/:platform')
  @ApiOperation({ summary: 'Capture lead from social media' })
  captureSocialMedia(
    @Param('platform') platform: string,
    @Body() dto: any,
  ) {
    return this.captureService.captureSocialMedia(platform, dto);
  }

  @Post('webhook/:source')
  @ApiOperation({ summary: 'Generic webhook endpoint for lead capture' })
  captureWebhook(
    @Param('source') source: string,
    @Body() dto: any,
    @Headers() headers: Record<string, string>,
  ) {
    return this.captureService.captureWebhook(source, dto, headers);
  }

  @Post('zapier')
  @ApiOperation({ summary: 'Capture lead from Zapier' })
  captureZapier(@Body() dto: any) {
    return this.captureService.captureZapier(dto);
  }

  @Post('mailchimp')
  @ApiOperation({ summary: 'Capture lead from MailChimp' })
  captureMailchimp(@Body() dto: any) {
    return this.captureService.captureMailchimp(dto);
  }

  @Post('facebook')
  @ApiOperation({ summary: 'Capture lead from Facebook Lead Ads' })
  captureFacebook(@Body() dto: any) {
    return this.captureService.captureFacebook(dto);
  }

  @Post('google-ads')
  @ApiOperation({ summary: 'Capture lead from Google Ads' })
  captureGoogleAds(@Body() dto: any) {
    return this.captureService.captureGoogleAds(dto);
  }

  @Post('email')
  @ApiOperation({ summary: 'Capture lead from email' })
  captureEmail(@Body() dto: any) {
    return this.captureService.captureEmail(dto);
  }

  @Post('cold-call')
  @ApiOperation({ summary: 'Capture lead from cold call' })
  captureColdCall(@Body() dto: any) {
    return this.captureService.captureColdCall(dto);
  }

  @Get('configs')
  @ApiOperation({ summary: 'Get all capture configurations' })
  getConfigs() {
    return this.captureService.getConfigs();
  }

  @Get('configs/:id')
  @ApiOperation({ summary: 'Get capture configuration by ID' })
  getConfig(@Param('id', ParseIntPipe) id: number) {
    return this.captureService.getConfig(id);
  }

  @Post('configs')
  @ApiOperation({ summary: 'Create capture configuration' })
  createConfig(@Body() dto: any) {
    return this.captureService.createConfig(dto);
  }

  @Put('configs/:id')
  @ApiOperation({ summary: 'Update capture configuration' })
  updateConfig(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.captureService.updateConfig(id, dto);
  }

  @Delete('configs/:id')
  @ApiOperation({ summary: 'Delete capture configuration' })
  deleteConfig(@Param('id', ParseIntPipe) id: number) {
    return this.captureService.deleteConfig(id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get capture history' })
  getHistory(@Query('limit') limit?: number, @Query('source') source?: string) {
    return this.captureService.getHistory(limit, source);
  }

  @Post('process/:id')
  @ApiOperation({ summary: 'Process unprocessed capture' })
  processCapture(@Param('id', ParseIntPipe) id: number) {
    return this.captureService.processCapture(id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get capture statistics' })
  getStats() {
    return this.captureService.getStats();
  }

  // ========== RabbitMQ MessagePattern Handlers ==========

  @MessagePattern(LEAD_PATTERNS.CAPTURE_WEBSITE_FORM)
  handleWebsiteForm(@Payload() data: { dto: any; metadata?: any }) {
    return this.captureService.captureWebsiteForm(data.dto, data.metadata);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_SOCIAL_MEDIA)
  handleSocialMedia(@Payload() data: { platform: string; dto: any }) {
    return this.captureService.captureSocialMedia(data.platform, data.dto);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_WEBHOOK)
  handleWebhook(@Payload() data: { source: string; dto: any; headers?: any }) {
    return this.captureService.captureWebhook(data.source, data.dto, data.headers);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_ZAPIER)
  handleZapier(@Payload() dto: any) {
    return this.captureService.captureZapier(dto);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_MAILCHIMP)
  handleMailchimp(@Payload() dto: any) {
    return this.captureService.captureMailchimp(dto);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_FACEBOOK)
  handleFacebook(@Payload() dto: any) {
    return this.captureService.captureFacebook(dto);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_GOOGLE_ADS)
  handleGoogleAds(@Payload() dto: any) {
    return this.captureService.captureGoogleAds(dto);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_EMAIL)
  handleEmail(@Payload() dto: any) {
    return this.captureService.captureEmail(dto);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_COLD_CALL)
  handleColdCall(@Payload() dto: any) {
    return this.captureService.captureColdCall(dto);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_GET_CONFIGS)
  handleGetConfigs() {
    return this.captureService.getConfigs();
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_CREATE_CONFIG)
  handleCreateConfig(@Payload() dto: any) {
    return this.captureService.createConfig(dto);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_UPDATE_CONFIG)
  handleUpdateConfig(@Payload() data: { id: number; dto: any }) {
    return this.captureService.updateConfig(data.id, data.dto);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_DELETE_CONFIG)
  handleDeleteConfig(@Payload() data: { id: number }) {
    return this.captureService.deleteConfig(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_GET_HISTORY)
  handleGetHistory(@Payload() data: { limit?: number; source?: string }) {
    return this.captureService.getHistory(data.limit, data.source);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_PROCESS)
  handleProcessCapture(@Payload() data: { id: number }) {
    return this.captureService.processCapture(data.id);
  }

  @MessagePattern(LEAD_PATTERNS.CAPTURE_GET_STATS)
  handleGetStats() {
    return this.captureService.getStats();
  }
}
