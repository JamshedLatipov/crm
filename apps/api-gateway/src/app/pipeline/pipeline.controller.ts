import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Inject,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { SERVICES, PIPELINE_PATTERNS } from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';

class CreateStageDto {
  name: string;
  order?: number;
  color?: string;
  probability?: number;
}

class UpdateStageDto {
  name?: string;
  order?: number;
  color?: string;
  probability?: number;
}

class StageResponseDto {
  id: string;
  name: string;
  order: number;
  color?: string;
  probability?: number;
  createdAt: string;
  updatedAt: string;
}

@ApiTags('pipeline')
@ApiBearerAuth('JWT-auth')
@Controller('pipeline')
@UseGuards(AuthGuard)
export class PipelineController {
  constructor(
    @Inject(SERVICES.DEAL) private readonly dealClient: ClientProxy,
  ) {}

  @Get('stages')
  @ApiOperation({ summary: 'Get all pipeline stages', description: 'Retrieve all pipeline stages' })
  @ApiResponse({ status: 200, description: 'List of stages', type: [StageResponseDto] })
  async findAll() {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.FIND_ALL_STAGES, {}).pipe(timeout(5000)),
    );
  }

  @Get('stages/:id')
  @ApiOperation({ summary: 'Get pipeline stage by ID', description: 'Retrieve a specific pipeline stage' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  @ApiResponse({ status: 200, description: 'Stage found', type: StageResponseDto })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  async findOne(@Param('id') id: string) {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.FIND_ONE_STAGE, { id }).pipe(timeout(5000)),
    );
  }

  @Post('stages')
  @ApiOperation({ summary: 'Create pipeline stage', description: 'Create a new pipeline stage' })
  @ApiResponse({ status: 201, description: 'Stage created', type: StageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateStageDto) {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.CREATE_STAGE, dto).pipe(timeout(5000)),
    );
  }

  @Put('stages/:id')
  @ApiOperation({ summary: 'Update pipeline stage', description: 'Update an existing pipeline stage' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  @ApiResponse({ status: 200, description: 'Stage updated', type: StageResponseDto })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.UPDATE_STAGE, { id, dto }).pipe(timeout(5000)),
    );
  }

  @Delete('stages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete pipeline stage', description: 'Remove a pipeline stage' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  @ApiResponse({ status: 204, description: 'Stage deleted' })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  async remove(@Param('id') id: string) {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.REMOVE_STAGE, { id }).pipe(timeout(5000)),
    );
  }

  @Post('stages/reorder')
  @ApiOperation({ summary: 'Reorder pipeline stages', description: 'Change the order of pipeline stages' })
  @ApiResponse({ status: 200, description: 'Stages reordered' })
  async reorder(@Body() body: { stageIds: string[] }) {
    return firstValueFrom(
      this.dealClient.send(PIPELINE_PATTERNS.REORDER_STAGES, body).pipe(timeout(5000)),
    );
  }
}
