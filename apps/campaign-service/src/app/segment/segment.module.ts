import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Segment } from './segment.entity';
import { SegmentService } from './segment.service';
import { SegmentController } from './segment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Segment])],
  controllers: [SegmentController],
  providers: [SegmentService],
  exports: [SegmentService],
})
export class SegmentModule {}
