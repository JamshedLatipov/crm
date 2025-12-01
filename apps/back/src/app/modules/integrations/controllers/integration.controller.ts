import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IntegrationService } from '../services/integration.service';
import { StandardizedCallInfo } from '../dto/call-info.dto';
import { IntegrationConfig } from '../entities/integration-config.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationController {
    constructor(
        private readonly integrationService: IntegrationService,
        @InjectRepository(IntegrationConfig)
        private configRepo: Repository<IntegrationConfig>
    ) {}

    @Get('call-info/:phone')
    @ApiOperation({ summary: 'Get standardized call info from external source' })
    @ApiResponse({ status: 200, type: StandardizedCallInfo })
    async getCallInfo(@Param('phone') phone: string): Promise<StandardizedCallInfo> {
        return this.integrationService.getCallInfo(phone);
    }

    // Endpoint to configure the integration (for admin usage)
    @Post('config')
    @ApiOperation({ summary: 'Create or update integration config' })
    async createConfig(@Body() config: Partial<IntegrationConfig>): Promise<IntegrationConfig> {
        return this.configRepo.save(config);
    }
    
    @Get('config')
    @ApiOperation({ summary: 'Get all integration configs' })
    async getConfigs(): Promise<IntegrationConfig[]> {
        return this.configRepo.find();
    }
}
