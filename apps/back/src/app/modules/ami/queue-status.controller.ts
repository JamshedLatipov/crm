import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { RedisQueueStatusService, OperatorStatusData, ChannelStatusData, QueueStatusData } from './redis-queue-status.service';
import { QueueDataSyncService } from './queue-data-sync.service';
import { RedisCallFlowService } from './redis-call-flow.service';

@Controller('queue-status')
export class QueueStatusController {
  constructor(
    private readonly redisStatus: RedisQueueStatusService,
    private readonly syncService: QueueDataSyncService,
    private readonly redisFlow: RedisCallFlowService,
  ) {}

  // ============= Operator Endpoints =============

  /**
   * GET /api/queue-status/operators
   * Get all operators with current status
   */
  @Get('operators')
  async getAllOperators() {
    const operators = await this.redisStatus.getAllOperators();
    return {
      success: true,
      data: operators,
      count: operators.length,
    };
  }

  /**
   * GET /api/queue-status/operators/:memberId
   * Get specific operator status
   */
  @Get('operators/:memberId')
  async getOperator(@Param('memberId') memberId: string) {
    const operator = await this.redisStatus.getOperatorStatus(memberId);
    return {
      success: !!operator,
      data: operator,
    };
  }

  /**
   * GET /api/queue-status/operators/queue/:queueName
   * Get all operators in a specific queue
   */
  @Get('operators/queue/:queueName')
  async getQueueOperators(@Param('queueName') queueName: string) {
    const operators = await this.redisStatus.getQueueOperators(queueName);
    return {
      success: true,
      data: operators,
      count: operators.length,
    };
  }

  /**
   * POST /api/queue-status/operators
   * Set operator status (for testing/manual updates)
   */
  @Post('operators')
  async setOperator(@Body() data: OperatorStatusData) {
    await this.redisStatus.setOperatorStatus(data);
    return {
      success: true,
      message: `Operator ${data.memberId} status updated`,
    };
  }

  /**
   * DELETE /api/queue-status/operators/:memberId
   * Remove operator from Redis
   */
  @Delete('operators/:memberId')
  async removeOperator(@Param('memberId') memberId: string) {
    await this.redisStatus.removeOperatorStatus(memberId);
    return {
      success: true,
      message: `Operator ${memberId} removed`,
    };
  }

  // ============= Channel Endpoints =============

  /**
   * GET /api/queue-status/channels
   * Get all active channels
   */
  @Get('channels')
  async getAllChannels() {
    const channels = await this.redisStatus.getAllChannels();
    return {
      success: true,
      data: channels,
      count: channels.length,
    };
  }

  /**
   * GET /api/queue-status/channels/:channelId
   * Get specific channel status
   */
  @Get('channels/:channelId')
  async getChannel(@Param('channelId') channelId: string) {
    const channel = await this.redisStatus.getChannelStatus(channelId);
    return {
      success: !!channel,
      data: channel,
    };
  }

  /**
   * POST /api/queue-status/channels
   * Set channel status (for testing/manual updates)
   */
  @Post('channels')
  async setChannel(@Body() data: ChannelStatusData) {
    await this.redisStatus.setChannelStatus(data);
    return {
      success: true,
      message: `Channel ${data.channelId} status updated`,
    };
  }

  /**
   * DELETE /api/queue-status/channels/:channelId
   * Remove channel from Redis
   */
  @Delete('channels/:channelId')
  async removeChannel(@Param('channelId') channelId: string) {
    await this.redisStatus.removeChannelStatus(channelId);
    return {
      success: true,
      message: `Channel ${channelId} removed`,
    };
  }

  // ============= Queue Endpoints =============

  /**
   * GET /api/queue-status/queues
   * Get all queues status
   */
  @Get('queues')
  async getAllQueues() {
    const queues = await this.redisStatus.getAllQueuesStatus();
    return {
      success: true,
      data: queues,
      count: queues.length,
    };
  }

  /**
   * GET /api/queue-status/queues/:queueName
   * Get specific queue status
   */
  @Get('queues/:queueName')
  async getQueue(@Param('queueName') queueName: string) {
    const queue = await this.redisStatus.getQueueStatus(queueName);
    return {
      success: !!queue,
      data: queue,
    };
  }

  /**
   * POST /api/queue-status/queues
   * Set queue status
   */
  @Post('queues')
  async setQueue(@Body() data: QueueStatusData) {
    await this.redisStatus.setQueueStatus(data);
    return {
      success: true,
      message: `Queue ${data.queueName} status updated`,
    };
  }

  // ============= Dashboard Endpoints =============

  /**
   * GET /api/queue-status/snapshot
   * Get complete dashboard snapshot (operators, channels, queues)
   */
  @Get('snapshot')
  async getFullSnapshot() {
    const snapshot = await this.redisStatus.getFullSnapshot();
    return {
      success: true,
      data: snapshot,
    };
  }

  /**
   * DELETE /api/queue-status/clear
   * Clear all status data (use with caution!)
   */
  @Delete('clear')
  async clearAll() {
    await this.redisStatus.clearAll();
    return {
      success: true,
      message: 'All queue status data cleared from Redis',
    };
  }

  // ============= Call Flow Endpoints =============

  /**
   * GET /api/queue-status/calls
   * List active call ids being tracked in Redis
   */
  @Get('calls')
  async listActiveCalls() {
    const calls = await this.redisFlow.listActiveCalls();
    return {
      success: true,
      data: calls,
      count: calls.length,
    };
  }

  /**
   * GET /api/queue-status/calls/:callId
   * Get call flow events for a given call id (uniqueid or channel)
   * Optional query param `limit` to limit number of events returned (most recent first)
   */
  @Get('calls/:callId')
  async getCallFlow(@Param('callId') callId: string, @Query('limit') limit?: string) {
    const l = limit ? Number(limit) : undefined;
    const flow = await this.redisFlow.getFlow(callId, l);
    return {
      success: true,
      data: flow,
      count: flow.length,
    };
  }

  /**
   * GET /api/queue-status/calls/:callId/meta
   * Get aggregated call meta (summary)
   */
  @Get('calls/:callId/meta')
  async getCallMeta(@Param('callId') callId: string) {
    const meta = await this.redisFlow.getMeta(callId);
    return {
      success: true,
      data: meta,
    };
  }

  // ============= Sync & Status Endpoints =============

  /**
   * GET /api/queue-status/sync/status
   * Get synchronization status (DB vs Redis record counts)
   */
  @Get('sync/status')
  async getSyncStatus() {
    const status = await this.syncService.getSyncStatus();
    return {
      success: true,
      data: status,
    };
  }

  /**
   * POST /api/queue-status/sync/resync
   * Manually trigger data resynchronization from DB to Redis
   */
  @Post('sync/resync')
  async triggerResync() {
    await this.syncService.resyncAll();
    return {
      success: true,
      message: 'Queue data resynchronization completed',
    };
  }
}
