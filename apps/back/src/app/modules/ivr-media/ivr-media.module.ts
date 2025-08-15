import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IvrMedia } from './entities/ivr-media.entity';
import { IvrMediaService } from './ivr-media.service';
import { IvrMediaController } from './ivr-media.controller';

@Module({
  imports: [ TypeOrmModule.forFeature([IvrMedia]) ],
  providers: [ IvrMediaService ],
  controllers: [ IvrMediaController ],
  exports: [ IvrMediaService ]
})
export class IvrMediaModule {}
