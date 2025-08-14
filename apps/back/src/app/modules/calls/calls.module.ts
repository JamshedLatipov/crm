import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PsEndpoint } from './entities/ps-endpoint.entity';
import { PsAor } from './entities/ps-aor.entity';
import { PsAuth } from './entities/ps-auth.entity';
import { Cdr } from './entities/cdr.entity';
import { PsEndpointService } from './services/ps-endpoint.service';
import { PsAorService } from './services/ps-aor.service';
import { PsAuthService } from './services/ps-auth.service';
import { CdrService } from './services/cdr.service';
import { CdrController } from './controllers/cdr.controller';
import { PsEndpointController } from './controllers/ps-endpoint.controller';
import { PsAorController } from './controllers/ps-aor.controller';
import { PsAuthController } from './controllers/ps-auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PsEndpoint,
      PsAor,
      PsAuth,
      Cdr,
    ]),
  ],
  providers: [
    PsEndpointService,
    PsAorService,
  PsAuthService,
  CdrService,
    
  ],
  controllers: [
    PsEndpointController,
    PsAorController,
    PsAuthController,
    CdrController,
    
  ],
  exports: [
    PsEndpointService,
    PsAorService,
    PsAuthService,
    CdrService,
  ],
})
export class CallsModule {}
