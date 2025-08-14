import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AriService } from './ari.service';
import { AriController } from './ari.controller';

@Module({
  providers: [AriService],
  controllers: [AriController],
  exports: [AriService]
})
export class AriModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly ari: AriService) {}
  async onModuleInit() { await this.ari.connect(); }
  async onModuleDestroy() { await this.ari.disconnect(); }
}
