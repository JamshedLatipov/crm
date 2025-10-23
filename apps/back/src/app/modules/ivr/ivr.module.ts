import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IvrNode } from './entities/ivr-node.entity';
import { IvrLog } from './entities/ivr-log.entity';
import { IvrMedia } from '../ivr-media/entities/ivr-media.entity';
import { IvrService } from './ivr.service';
import { IvrController } from './ivr.controller';
import { IvrRuntimeService } from './ivr-runtime.service';
import { IvrLogService } from './ivr-log.service';
import { AriModule } from '../ari/ari.module';

@Module({
  imports: [TypeOrmModule.forFeature([IvrNode, IvrLog, IvrMedia]), AriModule],
  providers: [IvrService, IvrRuntimeService, IvrLogService],
  controllers: [IvrController],
  exports: [IvrService]
})
export class IvrModule {}
