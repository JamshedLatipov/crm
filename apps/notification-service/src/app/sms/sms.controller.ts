import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { SmsService, SendSmsDto, CreateTemplateDto, UpdateTemplateDto } from './sms.service';
import { MessageStatus } from './entities/sms-message.entity';
import { TemplateCategory } from './entities/sms-template.entity';
import { NOTIFICATION_PATTERNS } from '@crm/contracts';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  // Messages
  @Post('send')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_SEND)
  async sendSms(@Body() dto: SendSmsDto) {
    return this.smsService.sendSms(dto);
  }

  @Post('send-bulk')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_SEND_BULK)
  async sendBulk(@Body() body: { recipients: SendSmsDto[] }) {
    return this.smsService.sendBulk(body.recipients);
  }

  @Get('messages')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_GET_MESSAGES)
  async getMessages(
    @Query('status') status?: MessageStatus,
    @Query('phoneNumber') phoneNumber?: string,
    @Query('contactId') contactId?: string,
    @Query('leadId') leadId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.smsService.getMessages({
      status,
      phoneNumber,
      contactId: contactId ? parseInt(contactId, 10) : undefined,
      leadId: leadId ? parseInt(leadId, 10) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('messages/:id')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_GET_MESSAGE)
  async getMessage(@Param('id') id: string) {
    return this.smsService.getMessage(id);
  }

  @Get('stats')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_GET_STATS)
  async getStats(
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    return this.smsService.getStats(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    );
  }

  // Templates
  @Get('templates')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_GET_TEMPLATES)
  async getTemplates(
    @Query('category') category?: TemplateCategory,
    @Query('activeOnly') activeOnly?: string
  ) {
    return this.smsService.getTemplates(category, activeOnly === 'true');
  }

  @Get('templates/:id')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_GET_TEMPLATE)
  async getTemplate(@Param('id') id: string) {
    return this.smsService.getTemplate(id);
  }

  @Post('templates')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_CREATE_TEMPLATE)
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.smsService.createTemplate(dto);
  }

  @Put('templates/:id')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_UPDATE_TEMPLATE)
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.smsService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_DELETE_TEMPLATE)
  async deleteTemplate(@Param('id') id: string) {
    return this.smsService.deleteTemplate(id);
  }

  @Post('templates/:id/toggle')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_TOGGLE_TEMPLATE)
  async toggleTemplate(@Param('id') id: string) {
    return this.smsService.toggleTemplate(id);
  }

  @Post('templates/:id/preview')
  @MessagePattern(NOTIFICATION_PATTERNS.SMS_PREVIEW_TEMPLATE)
  async previewTemplate(
    @Param('id') id: string,
    @Body() body: { variables: Record<string, any> }
  ) {
    const content = await this.smsService.previewTemplate(id, body.variables);
    return { content };
  }
}
