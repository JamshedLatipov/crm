import { Module } from '@nestjs/common';
import { ContactCenterModule } from '../contact-center/contact-center.module';
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
// import { AriReconciliationService } from './services/ari-reconciliation.service';
import { CdrController } from './controllers/cdr.controller';
import { PsEndpointController } from './controllers/ps-endpoint.controller';
import { PsAorController } from './controllers/ps-aor.controller';
import { PsAuthController } from './controllers/ps-auth.controller';
import { CallsController } from './controllers/calls.controller';
import { QueuesController } from './controllers/queues.controller';
import { QueueMembersController } from './controllers/queue-members.controller';
import { CallTransferService } from './services/call-transfer.service';
import { CallTraceService } from './services/call-trace.service';
import { CallAggregationService } from './services/call-aggregation.service';
import { CallTraceController } from './controllers/call-trace.controller';
import { CallLog } from './entities/call-log.entity';
import { CallSummary } from './entities/call-summary.entity';
import { AriModule } from '../ari/ari.module';
import { IvrLog } from '../ivr/entities/ivr-log.entity';
import { QueueLog } from './entities/queuelog.entity';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    AriModule,
    ContactCenterModule,
    PassportModule,
    UserModule,
    TypeOrmModule.forFeature([
      PsEndpoint,
      PsAor,
      PsAuth,
      Cdr,
      Queue,
      QueueMember,
      QueueLog,
      CallLog,
      CallSummary,
      IvrLog,
    ]),
  ],
  providers: [
    PsEndpointService,
    PsAorService,
    PsAuthService,
    CdrService,
    CallTraceService,
    CallAggregationService,
    CallTransferService,
    // reconciliation background worker
    ReconciliationService,
    // ARI-based near-realtime reconciliation
    // AriReconciliationService will subscribe to ARI events and update call_logs quickly
    // to reduce latency between frontend saveCallLog and Asterisk CDR
    // AriReconciliationService,
  ],
  controllers: [
    PsEndpointController,
    PsAorController,
    PsAuthController,
    CdrController,
    CallsController,
    QueuesController,
    QueueMembersController,
    CallTraceController,
  ],
  exports: [
    PsEndpointService,
    PsAorService,
    PsAuthService,
    CdrService,
    CallTransferService,
    CallTraceService,
  ],
})
export class CallsModule {}
