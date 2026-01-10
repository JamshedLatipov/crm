import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AriService } from './ari.service';
import { TELEPHONY_PATTERNS } from '@crm/contracts';

@Controller('ari')
export class AriController {
  constructor(private readonly ariService: AriService) {}

  @Get('status')
  @MessagePattern(TELEPHONY_PATTERNS.ARI_STATUS)
  getStatus() {
    return { connected: this.ariService.isConnected() };
  }

  @Get('channels')
  @MessagePattern(TELEPHONY_PATTERNS.ARI_GET_CHANNELS)
  async getChannels() {
    return this.ariService.getChannels();
  }

  @Get('bridges')
  @MessagePattern(TELEPHONY_PATTERNS.ARI_GET_BRIDGES)
  async getBridges() {
    return this.ariService.getBridges();
  }

  @Get('endpoints')
  @MessagePattern(TELEPHONY_PATTERNS.ARI_GET_ENDPOINTS)
  async getEndpoints() {
    return this.ariService.getEndpoints();
  }

  @Post('channels/:channelId/answer')
  @MessagePattern(TELEPHONY_PATTERNS.ARI_ANSWER_CHANNEL)
  async answerChannel(@Param('channelId') channelId: string) {
    await this.ariService.answerChannel(channelId);
    return { success: true };
  }

  @Post('channels/:channelId/hangup')
  @MessagePattern(TELEPHONY_PATTERNS.ARI_HANGUP_CHANNEL)
  async hangupChannel(@Param('channelId') channelId: string) {
    await this.ariService.hangupChannel(channelId);
    return { success: true };
  }

  @Post('channels/:channelId/play')
  @MessagePattern(TELEPHONY_PATTERNS.ARI_PLAY_MEDIA)
  async playMedia(
    @Param('channelId') channelId: string,
    @Body() body: { media: string }
  ) {
    return this.ariService.playMedia(channelId, body.media);
  }

  @Post('bridges')
  @MessagePattern(TELEPHONY_PATTERNS.ARI_CREATE_BRIDGE)
  async createBridge(@Body() body?: { type?: string }) {
    return this.ariService.createBridge(body?.type);
  }

  @Post('bridges/:bridgeId/channels/:channelId')
  @MessagePattern(TELEPHONY_PATTERNS.ARI_ADD_TO_BRIDGE)
  async addChannelToBridge(
    @Param('bridgeId') bridgeId: string,
    @Param('channelId') channelId: string
  ) {
    await this.ariService.addChannelToBridge(bridgeId, channelId);
    return { success: true };
  }
}
