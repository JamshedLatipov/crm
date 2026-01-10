import { Module } from '@nestjs/common';
import { AriService } from './ari.service';
import { AriController } from './ari.controller';

@Module({
  controllers: [AriController],
  providers: [AriService],
  exports: [AriService],
})
export class AriModule {}
