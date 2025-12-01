import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationConfig } from './entities/integration-config.entity';
import { IntegrationService } from './services/integration.service';
import { IntegrationController } from './controllers/integration.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([IntegrationConfig])
    ],
    controllers: [IntegrationController],
    providers: [IntegrationService],
    exports: [IntegrationService]
})
export class IntegrationsModule {}
