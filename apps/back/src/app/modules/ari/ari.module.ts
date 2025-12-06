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
  async onModuleInit() {
    if (process.env.DISABLE_ARI === 'true') {
      // ARI integration disabled by env flag
      return;
    }
    try {
      await this.ari.connect();
    } catch (error) {
      console.error(`Failed to connect to ARI: ${(error as Error).message}`);
      // Do not throw; allow app to start without ARI
    }
  }
  async onModuleDestroy() {
    if (process.env.DISABLE_ARI === 'true') return;
    await this.ari.disconnect();
  }
}
