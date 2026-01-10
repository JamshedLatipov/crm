import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AmiService } from './ami.service';
import { TELEPHONY_PATTERNS } from '@crm/contracts';

@Controller('ami')
export class AmiController {
  constructor(private readonly amiService: AmiService) {}

  @Get('status')
  @MessagePattern(TELEPHONY_PATTERNS.AMI_STATUS)
  getStatus() {
    return { connected: this.amiService.isConnected() };
  }

  @Post('action')
  @MessagePattern(TELEPHONY_PATTERNS.AMI_ACTION)
  async executeAction(@Body() body: { action: string; params?: Record<string, any> }) {
    return this.amiService.action(body.action, body.params || {});
  }

  @Post('originate')
  @MessagePattern(TELEPHONY_PATTERNS.AMI_ORIGINATE)
  async originate(@Body() body: { 
    channel: string; 
    extension: string; 
    context: string; 
    priority?: number;
    variables?: Record<string, string>;
  }) {
    return this.amiService.originate(
      body.channel, 
      body.extension, 
      body.context, 
      body.priority || 1,
      body.variables
    );
  }

  @Post('hangup/:channel')
  @MessagePattern(TELEPHONY_PATTERNS.AMI_HANGUP)
  async hangup(@Param('channel') channel: string) {
    return this.amiService.hangup(channel);
  }

  @Post('redirect')
  @MessagePattern(TELEPHONY_PATTERNS.AMI_REDIRECT)
  async redirect(@Body() body: { 
    channel: string; 
    extension: string; 
    context: string; 
    priority?: number;
  }) {
    return this.amiService.redirect(
      body.channel, 
      body.extension, 
      body.context, 
      body.priority || 1
    );
  }

  @Get('queue-status')
  @MessagePattern(TELEPHONY_PATTERNS.AMI_QUEUE_STATUS)
  async getQueueStatus(@Body() body?: { queue?: string }) {
    return this.amiService.getQueueStatus(body?.queue);
  }

  @Get('peer-status')
  @MessagePattern(TELEPHONY_PATTERNS.AMI_PEER_STATUS)
  async getPeerStatus(@Body() body?: { peer?: string }) {
    return this.amiService.getPeerStatus(body?.peer);
  }
}
