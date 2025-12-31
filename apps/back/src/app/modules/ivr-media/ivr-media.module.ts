import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IvrMedia } from './entities/ivr-media.entity';
import { IvrMediaService } from './ivr-media.service';
import { IvrMediaController } from './ivr-media.controller';
import { IvrModule } from '../ivr/ivr.module';

@Module({
  imports: [ 
    TypeOrmModule.forFeature([IvrMedia]),
    forwardRef(() => IvrModule),
  ],
  providers: [ IvrMediaService ],
  controllers: [ IvrMediaController ],
  exports: [ IvrMediaService ]
})
export class IvrMediaModule {}
