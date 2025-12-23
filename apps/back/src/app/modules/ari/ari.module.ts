import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AriService } from './ari.service';
import { AriEventsService } from './ari-events.service';
import { AriController } from './ari.controller';
import { AriEvent } from './entities/ari-event.entity';
import { AriEventStoreService } from './ari-event-store.service';

@Module({
  imports: [TypeOrmModule.forFeature([AriEvent])],
  providers: [AriService, AriEventsService, AriEventStoreService],
  controllers: [AriController],
  exports: [AriService, AriEventsService, AriEventStoreService]
})
export class AriModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly ari: AriService) {}
  async onModuleInit() {
    if (process.env.DISABLE_ARI === 'true') {
      // ARI integration disabled by env flag
      return;
    }
    await this.ari.connect();
  }
  async onModuleDestroy() {
    if (process.env.DISABLE_ARI === 'true') return;
    await this.ari.disconnect();
  }
}
