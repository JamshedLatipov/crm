import { Controller, Post, Body, Param, HttpCode, HttpStatus, UseGuards, ValidationPipe, UsePipes, Get, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { Patch } from '@nestjs/common';
import { Query, Res, Delete } from '@nestjs/common';
import { CurrentUser } from '../user/current-user.decorator';
import { Response } from 'express';
import { AdsIntegrationService } from './ads-integration.service';
import { normalizeGoogleLead } from './adapters/google.adapter';
import { normalizeFacebookLead } from './adapters/facebook.adapter';
import { WebhookGuard } from './guards/webhook.guard';
import { AdsWebhookDto } from './dto/webhook.dto';

@Controller('ads')
export class AdsIntegrationController {
  constructor(private readonly service: AdsIntegrationService) {}

  // List campaigns
  @Get('campaigns')
  async listCampaigns() {
    const data = await this.service.listCampaigns();
    return { success: true, data };
  }

  @Get('campaigns/:id/metrics')
  async getCampaignMetrics(@Param('id', ParseIntPipe) id: number) {
    if (!Number.isInteger(id)) throw new BadRequestException('Invalid campaign id');
    const data = await this.service.getCampaignMetrics(id);
    return { success: true, data };
  }

  @Patch('campaigns/:id')
  async updateCampaign(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    if (!Number.isInteger(id)) throw new BadRequestException('Invalid campaign id');
    const updated = await this.service.updateCampaign(id, body);
    return { success: true, data: updated };
  }

  @Post('campaigns/:id/pause')
  async pauseCampaign(@Param('id', ParseIntPipe) id: number) {
    if (!Number.isInteger(id)) throw new BadRequestException('Invalid campaign id');
    const updated = await this.service.pauseCampaign(id);
    return { success: true, data: updated };
  }

  @Post('campaigns/:id/resume')
  async resumeCampaign(@Param('id', ParseIntPipe) id: number) {
    if (!Number.isInteger(id)) throw new BadRequestException('Invalid campaign id');
    const updated = await this.service.resumeCampaign(id);
    return { success: true, data: updated };
  }

  // Start Facebook OAuth flow - redirects to FB oauth
  @Get('facebook/oauth/start')
  startFacebookOAuth(@Res() res: Response) {
    const appId = process.env.FB_APP_ID;
    const redirectUri = process.env.FB_OAUTH_REDIRECT || 'http://localhost:3000/api/ads/facebook/oauth/callback';
    const state = 'fb_sync';
    const url = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=ads_read,ads_management&state=${state}`;
    return res.redirect(url);
  }

  // OAuth callback
  @Get('facebook/oauth/callback')
  async facebookOAuthCallback(@Query('code') code: string, @Query('state') state: string, @CurrentUser() user?: any) {
    // exchange code for access token
    const result = await this.service.handleFacebookOAuthCallback(code);
    // If user is authenticated, link account
    if (user && user.sub) {
      await this.service.linkAccountToUser(result.id, Number(user.sub));
    }
    return { success: true, data: result };
  }

  @Post('sync/facebook')
  async triggerFacebookSync() {
    const result = await this.service.syncFacebookOnce();
    return { success: true, data: result };
  }

  @Post('facebook/refresh-tokens')
  async refreshFacebookTokens() {
    const result = await this.service.refreshFacebookTokens();
    return { success: true, data: result };
  }

  @Get('accounts')
  async listMyAccounts(@CurrentUser() user?: any) {
    if (!user || !user.sub) return { success: true, data: [] };
    const list = await this.service.listAccountsForUser(Number(user.sub));
    return { success: true, data: list };
  }

  @Delete('accounts/:id')
  async unlinkAccount(@Param('id') id: string, @CurrentUser() user?: any) {
    const res = await this.service.unlinkAccount(Number(id), user ? Number(user.sub) : undefined);
    return { success: true, data: res };
  }

  // Dev-only: seed ads data via HTTP call (convenience)
  @Post('seed')
  async seedAds() {
    const res = await this.service.seedAds();
    return { success: true, data: res };
  }

  @Post('accounts/:id/refresh')
  async refreshAccount(@Param('id') id: string, @CurrentUser() user?: any) {
    // optionally enforce ownership
    const res = await this.service.refreshAccount(Number(id));
    return { success: true, data: res };
  }

  // Generic webhook endpoint: POST /ads/webhook/:platform
  @Post('webhook/:platform')
  @UseGuards(WebhookGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @HttpCode(HttpStatus.ACCEPTED)
  async webhook(@Param('platform') platform: string, @Body() body: any) {
    const p = (platform || 'other').toLowerCase();
    if (p === 'google') {
      const normalized = normalizeGoogleLead(body);
      return this.service.handleIncomingLead(normalized, 'google');
    }
    if (p === 'facebook') {
      const normalized = normalizeFacebookLead(body);
      return this.service.handleIncomingLead(normalized, 'facebook');
    }
    return this.service.handleIncomingLead(body, 'other');
  }
}
