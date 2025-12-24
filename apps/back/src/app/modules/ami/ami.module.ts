import { Module } from '@nestjs/common';
import { AmiService } from './ami.service';
import { AriModule } from '../ari/ari.module';

@Module({
  imports: [AriModule],
  providers: [AmiService],
  exports: [AmiService],
})
export class AmiModule {}
