import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisplayConfig } from '@libs/shared/sto-types';
import { DisplayConfigService } from './services/display-config.service';
import { DisplayConfigController } from './controllers/display-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DisplayConfig])],
  controllers: [DisplayConfigController],
  providers: [DisplayConfigService],
  exports: [DisplayConfigService],
})
export class DisplayModule {}
