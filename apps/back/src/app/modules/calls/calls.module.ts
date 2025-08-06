import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PsEndpoint } from './entities/ps-endpoint.entity';
import { PsAor } from './entities/ps-aor.entity';
import { PsAuth } from './entities/ps-auth.entity';
import { PsDomainAlias } from './entities/ps-domain-alias.entity';
import { PsEndpointIdIp } from './entities/ps-endpoint-id-ip.entity';
import { PsContact } from './entities/ps-contact.entity';
import { PsQualify } from './entities/ps-qualify.entity';
import { PsRegistration } from './entities/ps-registration.entity';
import { PsGlobal } from './entities/ps-global.entity';
import { PsEndpointService } from './services/ps-endpoint.service';
import { PsAorService } from './services/ps-aor.service';
import { PsAuthService } from './services/ps-auth.service';
import { PsDomainAliasService } from './services/ps-domain-alias.service';
import { PsEndpointIdIpService } from './services/ps-endpoint-id-ip.service';
import { PsContactService } from './services/ps-contact.service';
import { PsQualifyService } from './services/ps-qualify.service';
import { PsRegistrationService } from './services/ps-registration.service';
import { PsGlobalService } from './services/ps-global.service';
import { PsEndpointController } from './controllers/ps-endpoint.controller';
import { PsAorController } from './controllers/ps-aor.controller';
import { PsAuthController } from './controllers/ps-auth.controller';
import { PsDomainAliasController } from './controllers/ps-domain-alias.controller';
import { PsEndpointIdIpController } from './controllers/ps-endpoint-id-ip.controller';
import { PsContactController } from './controllers/ps-contact.controller';
import { PsQualifyController } from './controllers/ps-qualify.controller';
import { PsRegistrationController } from './controllers/ps-registration.controller';
import { PsGlobalController } from './controllers/ps-global.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PsEndpoint,
      PsAor,
      PsAuth,
      PsDomainAlias,
      PsEndpointIdIp,
      PsContact,
      PsQualify,
      PsRegistration,
      PsGlobal,
    ]),
  ],
  providers: [
    PsEndpointService,
    PsAorService,
    PsAuthService,
    PsDomainAliasService,
    PsEndpointIdIpService,
    PsContactService,
    PsQualifyService,
    PsRegistrationService,
    PsGlobalService,
  ],
  controllers: [
    PsEndpointController,
    PsAorController,
    PsAuthController,
    PsDomainAliasController,
    PsEndpointIdIpController,
    PsContactController,
    PsQualifyController,
    PsRegistrationController,
    PsGlobalController,
  ],
  exports: [
    PsEndpointService,
    PsAorService,
    PsAuthService,
    PsDomainAliasService,
    PsEndpointIdIpService,
    PsContactService,
    PsQualifyService,
    PsRegistrationService,
    PsGlobalService,
  ],
})
export class CallsModule {}
