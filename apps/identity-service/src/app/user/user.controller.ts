import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, Logger, NotFoundException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import {
  IDENTITY_PATTERNS,
  CreateUserDto,
  UpdateUserDto,
  UpdateWorkloadDto,
  AutoAssignCriteriaDto,
  PaginationQueryDto,
} from '@crm/contracts';

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  // ==================== HTTP Endpoints ====================

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.userService.findAll(query);
  }

  @Get('managers')
  async getManagers(@Query('availableOnly') availableOnly?: string) {
    return this.userService.getManagers(availableOnly === 'true');
  }

  @Get('managers/stats')
  async getManagersStats() {
    return this.userService.getManagersStatistics();
  }

  @Post('managers/auto-assign')
  async getAutoAssignRecommendation(@Body() criteria: AutoAssignCriteriaDto) {
    const manager = await this.userService.getOptimalManagerForAssignment(criteria);
    if (!manager) {
      throw new NotFoundException('No suitable manager found for auto-assignment');
    }
    return manager;
  }

  @Get('managers/:id')
  async getManagerById(@Param('id', ParseIntPipe) id: number) {
    const manager = await this.userService.findById(id);
    if (!manager) {
      throw new NotFoundException(`Manager with ID ${id} not found`);
    }
    return manager;
  }

  @Put('managers/:id/lead-count')
  async updateLeadCount(
    @Param('id', ParseIntPipe) id: number,
    @Body('increment') increment: number,
  ) {
    return this.userService.updateLeadCount(id, increment);
  }

  @Post('seed-managers')
  async seedManagers() {
    return this.userService.seedTestManagers();
  }

  @Get('timezones')
  async getTimezones() {
    return this.userService.getTimezones();
  }

  @Get('export')
  async exportUsers(@Query('format') format: 'csv' | 'excel' = 'csv') {
    return this.userService.exportUsers(format);
  }

  @Post('bulk-delete')
  async bulkDelete(@Body('userIds') userIds: number[]) {
    return this.userService.bulkDelete(userIds);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.userService.resetPassword(id);
  }

  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.userService.delete(id);
  }

  // ==================== Microservice Patterns (RabbitMQ) ====================

  @MessagePattern(IDENTITY_PATTERNS.GET_USER)
  async handleGetUser(@Payload() data: { id: number }) {
    this.logger.debug(`RPC: GET_USER id=${data.id}`);
    return this.userService.findById(data.id);
  }

  @MessagePattern(IDENTITY_PATTERNS.GET_USERS)
  async handleGetUsers(@Payload() data: PaginationQueryDto) {
    this.logger.debug(`RPC: GET_USERS`);
    return this.userService.findAll(data);
  }

  @MessagePattern(IDENTITY_PATTERNS.GET_USER_BY_USERNAME)
  async handleGetUserByUsername(@Payload() data: { username: string }) {
    this.logger.debug(`RPC: GET_USER_BY_USERNAME username=${data.username}`);
    const user = await this.userService.findByUsername(data.username);
    if (!user) return null;
    // Return without password
    const { password, ...result } = user;
    return result;
  }

  @MessagePattern(IDENTITY_PATTERNS.CREATE_USER)
  async handleCreateUser(@Payload() dto: CreateUserDto) {
    this.logger.debug(`RPC: CREATE_USER username=${dto.username}`);
    return this.userService.create(dto);
  }

  @MessagePattern(IDENTITY_PATTERNS.UPDATE_USER)
  async handleUpdateUser(@Payload() data: { id: number; dto: UpdateUserDto }) {
    this.logger.debug(`RPC: UPDATE_USER id=${data.id}`);
    return this.userService.update(data.id, data.dto);
  }

  @MessagePattern(IDENTITY_PATTERNS.DELETE_USER)
  async handleDeleteUser(@Payload() data: { id: number }) {
    this.logger.debug(`RPC: DELETE_USER id=${data.id}`);
    return this.userService.delete(data.id);
  }

  @MessagePattern(IDENTITY_PATTERNS.BULK_DELETE_USERS)
  async handleBulkDeleteUsers(@Payload() data: { userIds: number[] }) {
    this.logger.debug(`RPC: BULK_DELETE_USERS count=${data.userIds?.length}`);
    return this.userService.bulkDelete(data.userIds);
  }

  @MessagePattern(IDENTITY_PATTERNS.RESET_PASSWORD)
  async handleResetPassword(@Payload() data: { id: number }) {
    this.logger.debug(`RPC: RESET_PASSWORD id=${data.id}`);
    return this.userService.resetPassword(data.id);
  }

  @MessagePattern(IDENTITY_PATTERNS.EXPORT_USERS)
  async handleExportUsers(@Payload() data: { format: 'csv' | 'excel' }) {
    this.logger.debug(`RPC: EXPORT_USERS format=${data.format}`);
    return this.userService.exportUsers(data.format);
  }

  @MessagePattern(IDENTITY_PATTERNS.GET_MANAGERS)
  async handleGetManagers(@Payload() data: { availableOnly?: boolean }) {
    this.logger.debug(`RPC: GET_MANAGERS availableOnly=${data.availableOnly}`);
    return this.userService.getManagers(data.availableOnly);
  }

  @MessagePattern(IDENTITY_PATTERNS.GET_MANAGER)
  async handleGetManager(@Payload() data: { id: number }) {
    this.logger.debug(`RPC: GET_MANAGER id=${data.id}`);
    return this.userService.findById(data.id);
  }

  @MessagePattern(IDENTITY_PATTERNS.GET_MANAGERS_STATS)
  async handleGetManagersStats() {
    this.logger.debug(`RPC: GET_MANAGERS_STATS`);
    return this.userService.getManagersStatistics();
  }

  @MessagePattern(IDENTITY_PATTERNS.GET_OPTIMAL_MANAGER)
  async handleGetOptimalManager(@Payload() criteria: AutoAssignCriteriaDto) {
    this.logger.debug(`RPC: GET_OPTIMAL_MANAGER`);
    return this.userService.getOptimalManagerForAssignment(criteria);
  }

  @MessagePattern(IDENTITY_PATTERNS.UPDATE_WORKLOAD)
  async handleUpdateWorkload(@Payload() dto: UpdateWorkloadDto) {
    this.logger.debug(`RPC: UPDATE_WORKLOAD userId=${dto.userId}`);
    return this.userService.updateWorkload(dto);
  }

  @MessagePattern(IDENTITY_PATTERNS.UPDATE_LEAD_COUNT)
  async handleUpdateLeadCount(@Payload() data: { id: number; increment: number }) {
    this.logger.debug(`RPC: UPDATE_LEAD_COUNT id=${data.id} increment=${data.increment}`);
    return this.userService.updateLeadCount(data.id, data.increment);
  }

  @MessagePattern(IDENTITY_PATTERNS.SEED_MANAGERS)
  async handleSeedManagers() {
    this.logger.debug(`RPC: SEED_MANAGERS`);
    return this.userService.seedTestManagers();
  }

  @MessagePattern(IDENTITY_PATTERNS.GET_TIMEZONES)
  async handleGetTimezones() {
    this.logger.debug(`RPC: GET_TIMEZONES`);
    return this.userService.getTimezones();
  }

  @MessagePattern(IDENTITY_PATTERNS.HEALTH_CHECK)
  handleHealthCheck() {
    return { status: 'ok', service: 'identity-service', timestamp: new Date().toISOString() };
  }
}
