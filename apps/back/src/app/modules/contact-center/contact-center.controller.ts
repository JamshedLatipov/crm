import { Controller, Get, Post, Put, Query, Body, Param } from '@nestjs/common';
import { ContactCenterService } from './contact-center.service';
import { NameResolverService, ResolvedName } from './services/name-resolver.service';
import { AgentStatusEnum } from './enums/agent-status.enum';

/**
 * DTO for setting agent status
 */
class SetAgentStatusDto {
  extension: string;
  status: AgentStatusEnum;
  userId?: number;
  fullName?: string;
  reason?: string;
  queueName?: string;
  currentCallId?: string;
}

/**
 * DTO for supervisor call actions
 */
class SupervisorCallActionDto {
  operatorExtension: string;
  supervisorExtension: string;
}

class TransferCallDto {
  channel: string;
  targetExtension: string;
}

class RecordingDto {
  channel: string;
  filename?: string;
}

class QueueMemberPauseDto {
  operatorInterface: string;
  queueName?: string;
  reason?: string;
}

@Controller('contact-center')
export class ContactCenterController {
  constructor(
    private readonly svc: ContactCenterService,
    private readonly nameResolver: NameResolverService,
  ) {}

  @Get('operators')
  getOperators() {
    return this.svc.getOperatorsSnapshot();
  }

  @Get('queues')
  getQueues() {
    return this.svc.getQueuesSnapshot();
  }

  @Get('active-calls')
  getActiveCalls() {
    return this.svc.getActiveCalls();
  }

  // ========== Agent Status Endpoints ==========

  /**
   * Get all agent statuses
   * Query params:
   *   - status: filter by status (optional)
   *   - queueName: filter by queue (optional)
   *   - availableOnly: show only available agents (optional)
   */
  @Get('agent-statuses')
  async getAgentStatuses(
    @Query('status') status?: AgentStatusEnum,
    @Query('queueName') queueName?: string,
    @Query('availableOnly') availableOnly?: string
  ) {
    return this.svc.getAllAgentStatuses({
      status,
      queueName,
      availableOnly: availableOnly === 'true',
    });
  }

  /**
   * Get single agent status by extension
   */
  @Get('agent-statuses/:extension')
  async getAgentStatus(@Param('extension') extension: string) {
    const status = await this.svc.getAgentStatus(extension);
    if (!status) {
      return { error: 'Agent not found', extension };
    }
    return status;
  }

  /**
   * Set agent status
   */
  @Post('agent-statuses')
  async setAgentStatus(@Body() dto: SetAgentStatusDto) {
    return this.svc.setAgentStatus(dto.extension, dto.status, {
      userId: dto.userId,
      fullName: dto.fullName,
      reason: dto.reason,
      queueName: dto.queueName,
      currentCallId: dto.currentCallId,
    });
  }

  /**
   * Quick actions for common status changes
   */
  @Post('agent-statuses/:extension/online')
  async setAgentOnline(
    @Param('extension') extension: string,
    @Body() body?: { fullName?: string; queueName?: string }
  ) {
    return this.svc.setAgentOnline(extension, body);
  }

  @Post('agent-statuses/:extension/offline')
  async setAgentOffline(
    @Param('extension') extension: string,
    @Body() body?: { reason?: string }
  ) {
    return this.svc.setAgentOffline(extension, body?.reason);
  }

  @Post('agent-statuses/:extension/break')
  async setAgentOnBreak(
    @Param('extension') extension: string,
    @Body() body?: { reason?: string }
  ) {
    return this.svc.setAgentOnBreak(extension, body?.reason);
  }

  @Post('agent-statuses/:extension/wrap-up')
  async setAgentWrapUp(
    @Param('extension') extension: string,
    @Body() body?: { callId?: string }
  ) {
    return this.svc.setAgentWrapUp(extension, body?.callId);
  }

  /**
   * Get agents stuck in temporary statuses (for alerts)
   */
  @Get('agent-statuses-stuck')
  async getStuckAgents(@Query('maxMinutes') maxMinutes?: string) {
    const minutes = parseInt(maxMinutes || '60', 10);
    return this.svc.getStuckAgents(minutes);
  }

  // ========== Debug Endpoints ==========

  @Get('debug/cdr-sample')
  async getDebugCdrSample(@Query('limit') limit?: string) {
    return this.svc.getDebugCdrSample(parseInt(limit || '10', 10));
  }

  @Get('debug/cdr-all')
  async getDebugCdrAll(@Query('limit') limit?: string) {
    return this.svc.getDebugCdrAll(parseInt(limit || '10', 10));
  }

  @Get('debug/members')
  async getDebugMembers() {
    return this.svc.getDebugMembers();
  }

  @Get('operators/:operatorId/details')
  async getOperatorDetails(
    @Param('operatorId') operatorId: string,
    @Query('range') range?: 'today' | 'week' | 'month' | 'custom',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.svc.getOperatorDetails(operatorId, range, startDate, endDate);
  }

  // ========== Supervisor Actions ==========

  /**
   * Whisper to an operator - supervisor speaks to operator only
   */
  @Post('supervisor/whisper')
  async whisperCall(@Body() dto: SupervisorCallActionDto) {
    return this.svc.whisperCall(dto.operatorExtension, dto.supervisorExtension);
  }

  /**
   * Barge into a call - supervisor joins as third party
   */
  @Post('supervisor/barge')
  async bargeCall(@Body() dto: SupervisorCallActionDto) {
    return this.svc.bargeCall(dto.operatorExtension, dto.supervisorExtension);
  }

  /**
   * Hangup a call by channel
   */
  @Post('supervisor/hangup/:channel')
  async hangupCall(@Param('channel') channel: string) {
    return this.svc.hangupCall(decodeURIComponent(channel));
  }

  /**
   * Transfer a call to another extension
   */
  @Post('supervisor/transfer')
  async transferCall(@Body() dto: TransferCallDto) {
    return this.svc.transferCall(dto.channel, dto.targetExtension);
  }

  /**
   * Start recording a call
   */
  @Post('supervisor/recording/start')
  async startRecording(@Body() dto: RecordingDto) {
    return this.svc.startRecording(dto.channel, dto.filename);
  }

  /**
   * Stop recording a call
   */
  @Post('supervisor/recording/stop')
  async stopRecording(@Body() dto: RecordingDto) {
    return this.svc.stopRecording(dto.channel);
  }

  /**
   * Pause an operator in queue(s)
   */
  @Post('supervisor/queue-member/pause')
  async pauseQueueMember(@Body() dto: QueueMemberPauseDto) {
    return this.svc.pauseQueueMember(dto.operatorInterface, dto.queueName, dto.reason);
  }

  /**
   * Unpause an operator in queue(s)
   */
  @Post('supervisor/queue-member/unpause')
  async unpauseQueueMember(@Body() dto: QueueMemberPauseDto) {
    return this.svc.unpauseQueueMember(dto.operatorInterface, dto.queueName);
  }

  /**
   * Get channel by uniqueid (for supervisor actions)
   */
  @Get('supervisor/channel/:uniqueid')
  async getChannelByUniqueid(@Param('uniqueid') uniqueid: string) {
    const channel = await this.svc.getChannelByUniqueid(uniqueid);
    return { channel };
  }

  // ========== Name Resolution Endpoints ==========

  /**
   * Resolve phone number to contact name
   */
  @Get('resolve/phone/:phone')
  async resolvePhone(@Param('phone') phone: string): Promise<ResolvedName> {
    return this.nameResolver.resolvePhoneNumber(decodeURIComponent(phone));
  }

  /**
   * Resolve operator SIP endpoint to user name
   */
  @Get('resolve/operator/:endpoint')
  async resolveOperator(@Param('endpoint') endpoint: string): Promise<ResolvedName> {
    return this.nameResolver.resolveOperator(decodeURIComponent(endpoint));
  }

  /**
   * Batch resolve phone numbers
   */
  @Post('resolve/phones')
  async resolvePhones(@Body() body: { phones: string[] }): Promise<Record<string, ResolvedName>> {
    const results = await this.nameResolver.resolvePhoneNumbers(body.phones);
    return Object.fromEntries(results);
  }

  /**
   * Batch resolve operators
   */
  @Post('resolve/operators')
  async resolveOperators(@Body() body: { endpoints: string[] }): Promise<Record<string, ResolvedName>> {
    const results = await this.nameResolver.resolveOperators(body.endpoints);
    return Object.fromEntries(results);
  }
}
