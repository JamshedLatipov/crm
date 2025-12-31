import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallLog } from './entities/call-log.entity';
import { CallService } from './call.service';
import { CallController } from './call.controller';
import { AsteriskService } from './asterisk.service';

@Module({
  imports: [TypeOrmModule.forFeature([CallLog])],
  controllers: [CallController],
  providers: [CallService, AsteriskService],
  exports: [CallService, AsteriskService],
})
export class CallModule {}
