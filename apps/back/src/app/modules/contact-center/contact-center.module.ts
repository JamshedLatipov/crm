import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactCenterController } from './contact-center.controller';
import { ContactCenterGateway } from './contact-center.gateway';
import { ContactCenterService } from './contact-center.service';
import { EndpointSyncService } from './endpoint-sync.service';
import { Queue } from '../calls/entities/queue.entity';
import { QueueMember } from '../calls/entities/queue-member.entity';
import { Cdr } from '../calls/entities/cdr.entity';
import { User } from '../user/user.entity';
import { AgentStatus } from './entities/agent-status.entity';
import { AgentStatusHistory } from './entities/agent-status-history.entity';
import { AmiModule } from '../ami/ami.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Queue, QueueMember, Cdr, User, AgentStatus, AgentStatusHistory]),
    AmiModule,
  ],
  controllers: [ContactCenterController],
  providers: [
    ContactCenterGateway,
    ContactCenterService,
    EndpointSyncService,
    // Provide tokens for circular dependency resolution
    {
      provide: 'CONTACT_CENTER_GATEWAY',
      useExisting: forwardRef(() => ContactCenterGateway),
    },
    {
      provide: 'CONTACT_CENTER_SERVICE',
      useExisting: forwardRef(() => ContactCenterService),
    },
  ],
  exports: [ContactCenterService],
})
export class ContactCenterModule {}
