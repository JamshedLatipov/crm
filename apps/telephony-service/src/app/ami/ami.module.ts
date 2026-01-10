import { Module } from '@nestjs/common';
import { AmiService } from './ami.service';
import { AmiController } from './ami.controller';

@Module({
  controllers: [AmiController],
  providers: [AmiService],
  exports: [AmiService],
})
export class AmiModule {}
