import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AmiService } from './ami.service';
import { RedisQueueStatusService } from './redis-queue-status.service';
import { RedisCallFlowService } from './redis-call-flow.service';
import { QueueStatusController } from './queue-status.controller';
import { AmiEventsController } from './ami-events.controller';
import { QueueDataSyncService } from './queue-data-sync.service';
import { AriModule } from '../ari/ari.module';
import { QueueMember } from '../calls/entities/queue-member.entity';
import { Queue } from '../calls/entities/queue.entity';

@Module({
  imports: [AriModule, TypeOrmModule.forFeature([QueueMember, Queue])],
  controllers: [QueueStatusController, AmiEventsController],
  providers: [AmiService, RedisQueueStatusService, QueueDataSyncService, RedisCallFlowService],
  exports: [AmiService, RedisQueueStatusService, RedisCallFlowService],
})
export class AmiModule {}
