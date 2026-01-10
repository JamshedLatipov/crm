import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IvrService } from './ivr.service';
import { IvrController } from './ivr.controller';
import { IvrNode } from './entities/ivr-node.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IvrNode])],
  controllers: [IvrController],
  providers: [IvrService],
  exports: [IvrService],
})
export class IvrModule {}
