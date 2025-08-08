import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PsEndpoint } from './entities/ps-endpoint.entity';
import { PsAor } from './entities/ps-aor.entity';
import { PsAuth } from './entities/ps-auth.entity';
import { PsEndpointService } from './services/ps-endpoint.service';
import { PsAorService } from './services/ps-aor.service';
import { PsAuthService } from './services/ps-auth.service';
import { PsEndpointController } from './controllers/ps-endpoint.controller';
import { PsAorController } from './controllers/ps-aor.controller';
import { PsAuthController } from './controllers/ps-auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PsEndpoint,
      PsAor,
      PsAuth,
    ]),
  ],
  providers: [
    PsEndpointService,
    PsAorService,
    PsAuthService,
  ],
  controllers: [
    PsEndpointController,
    PsAorController,
    PsAuthController,
  ],
  exports: [
    PsEndpointService,
    PsAorService,
    PsAuthService,
  ],
})
export class CallsModule {}
