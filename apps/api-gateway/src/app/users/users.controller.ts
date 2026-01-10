import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  ParseIntPipe,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import {
  SERVICES,
  IDENTITY_PATTERNS,
  CreateUserDto,
  UpdateUserDto,
  PaginationQueryDto,
  UserDto,
  PaginatedResponseDto,
} from '@crm/contracts';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    @Inject(SERVICES.IDENTITY) private readonly identityClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all users', description: 'Retrieve paginated list of users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<UserDto>> {
    return this.send(IDENTITY_PATTERNS.GET_USERS, query);
  }

  @Get('managers')
  @ApiOperation({ summary: 'Get managers list', description: 'Retrieve list of users with manager role' })
  @ApiQuery({ name: 'availableOnly', required: false, description: 'Filter available managers only' })
  @ApiResponse({ status: 200, description: 'List of managers' })
  async getManagers(@Query('availableOnly') availableOnly?: string): Promise<UserDto[]> {
    return this.send(IDENTITY_PATTERNS.GET_MANAGERS, { availableOnly: availableOnly === 'true' });
  }

  @Get('managers/stats')
  @ApiOperation({ summary: 'Get managers statistics', description: 'Aggregate statistics about managers' })
  @ApiResponse({ status: 200, description: 'Managers statistics' })
  async getManagersStats() {
    return this.send(IDENTITY_PATTERNS.GET_MANAGERS_STATS, {});
  }

  @Post('managers/auto-assign')
  @ApiOperation({ summary: 'Get auto-assignment recommendation', description: 'Get optimal manager for assignment' })
  @ApiResponse({ status: 200, description: 'Recommended manager' })
  @ApiResponse({ status: 404, description: 'No suitable manager found' })
  async getAutoAssignRecommendation(@Body() criteria: any) {
    return this.send(IDENTITY_PATTERNS.GET_OPTIMAL_MANAGER, criteria);
  }

  @Get('managers/:id')
  @ApiOperation({ summary: 'Get manager by ID', description: 'Retrieve a specific manager' })
  @ApiParam({ name: 'id', description: 'Manager ID' })
  @ApiResponse({ status: 200, description: 'Manager found' })
  @ApiResponse({ status: 404, description: 'Manager not found' })
  async getManagerById(@Param('id', ParseIntPipe) id: number) {
    const manager = await this.send(IDENTITY_PATTERNS.GET_MANAGER, { id });
    if (!manager) {
      throw new NotFoundException(`Manager with ID ${id} not found`);
    }
    return manager;
  }

  @Put('managers/:id/lead-count')
  @ApiOperation({ summary: 'Update manager lead count', description: 'Increment or decrement lead count' })
  @ApiParam({ name: 'id', description: 'Manager ID' })
  @ApiResponse({ status: 200, description: 'Lead count updated' })
  async updateLeadCount(
    @Param('id', ParseIntPipe) id: number,
    @Body('increment') increment: number
  ) {
    return this.send(IDENTITY_PATTERNS.UPDATE_LEAD_COUNT, { id, increment });
  }

  @Post('seed-managers')
  @ApiOperation({ summary: 'Seed test managers', description: 'Create test manager users' })
  @ApiResponse({ status: 201, description: 'Test managers created' })
  async seedTestManagers() {
    return this.send(IDENTITY_PATTERNS.SEED_MANAGERS, {});
  }

  @Get('export')
  @ApiOperation({ summary: 'Export users', description: 'Export users to CSV or Excel' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'excel'], description: 'Export format' })
  @ApiResponse({ status: 200, description: 'Users exported' })
  async exportUsers(@Query('format') format: 'csv' | 'excel' = 'csv') {
    return this.send(IDENTITY_PATTERNS.EXPORT_USERS, { format });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieve a specific user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    const user = await this.send<UserDto | null>(IDENTITY_PATTERNS.GET_USER, { id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Post()
  @ApiOperation({ summary: 'Create user', description: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  async create(@Body() dto: CreateUserDto): Promise<UserDto> {
    return this.send(IDENTITY_PATTERNS.CREATE_USER, dto);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'Reset user password', description: 'Reset password and get temporary password' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.send(IDENTITY_PATTERNS.RESET_PASSWORD, { id });
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete users', description: 'Soft delete multiple users' })
  @ApiResponse({ status: 200, description: 'Users deleted' })
  async bulkDeleteUsers(@Body('userIds') userIds: number[]) {
    return this.send(IDENTITY_PATTERNS.BULK_DELETE_USERS, { userIds });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user', description: 'Update an existing user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto
  ): Promise<UserDto> {
    return this.send(IDENTITY_PATTERNS.UPDATE_USER, { id, dto });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user', description: 'Soft delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.send(IDENTITY_PATTERNS.DELETE_USER, { id });
  }

  private async send<T>(pattern: string, data: unknown): Promise<T> {
    return firstValueFrom(
      this.identityClient.send<T>(pattern, data).pipe(
        timeout(5000),
        catchError(err => {
          this.logger.error(`RPC ${pattern} failed:`, err);
          throw err;
        })
      )
    );
  }
}
