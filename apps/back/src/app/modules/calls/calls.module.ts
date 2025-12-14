import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PsEndpoint } from './entities/ps-endpoint.entity';
import { PsAor } from './entities/ps-aor.entity';
import { PsAuth } from './entities/ps-auth.entity';
import { Cdr } from './entities/cdr.entity';
import { Queue } from './entities/queue.entity';
import { QueueMember } from './entities/queue-member.entity';
import { PsEndpointService } from './services/ps-endpoint.service';
import { PsAorService } from './services/ps-aor.service';
import { PsAuthService } from './services/ps-auth.service';
import { CdrService } from './services/cdr.service';
import { ReconciliationService } from './services/reconciliation.service';
import { AriReconciliationService } from './services/ari-reconciliation.service';
import { CdrController } from './controllers/cdr.controller';
import { PsEndpointController } from './controllers/ps-endpoint.controller';
import { PsAorController } from './controllers/ps-aor.controller';
import { PsAuthController } from './controllers/ps-auth.controller';
import { CallsController } from './controllers/calls.controller';
import { QueuesController } from './controllers/queues.controller';
import { CallTransferService } from './services/call-transfer.service';
import { CallLog } from './entities/call-log.entity';
import { AriModule } from '../ari/ari.module';
import { QueueLog } from './entities/queuelog.entity';

@Module({
  imports: [
    AriModule,
    TypeOrmModule.forFeature([
      PsEndpoint,
      PsAor,
      PsAuth,
      Cdr,
      Queue,
      QueueMember,
      QueueLog,
      CallLog,
    ]),
  ],
  providers: [
    PsEndpointService,
    PsAorService,
    PsAuthService,
    CdrService,
    CallTransferService,
    // reconciliation background worker
    ReconciliationService,
    // ARI-based near-realtime reconciliation
    // AriReconciliationService will subscribe to ARI events and update call_logs quickly
    // to reduce latency between frontend saveCallLog and Asterisk CDR
    AriReconciliationService,
  ],
  controllers: [
    PsEndpointController,
    PsAorController,
    PsAuthController,
    CdrController,
    CallsController,
    QueuesController,
  ],
  exports: [
    PsEndpointService,
    PsAorService,
    PsAuthService,
    CdrService,
    CallTransferService,
  ],
})
export class CallsModule {}
