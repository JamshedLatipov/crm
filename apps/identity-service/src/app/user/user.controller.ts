import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, Logger } from '@nestjs/common';
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

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
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

  @MessagePattern(IDENTITY_PATTERNS.GET_MANAGERS)
  async handleGetManagers(@Payload() data: { availableOnly?: boolean }) {
    this.logger.debug(`RPC: GET_MANAGERS availableOnly=${data.availableOnly}`);
    return this.userService.getManagers(data.availableOnly);
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

  @MessagePattern(IDENTITY_PATTERNS.HEALTH_CHECK)
  handleHealthCheck() {
    return { status: 'ok', service: 'identity-service', timestamp: new Date().toISOString() };
  }
}
