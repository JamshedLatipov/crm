import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { SERVICES } from '../constants';
import { IDENTITY_PATTERNS } from '../patterns';
import {
  UserDto,
  CreateUserDto,
  UpdateUserDto,
  UpdateWorkloadDto,
  AutoAssignCriteriaDto,
  PaginationQueryDto,
  PaginatedResponseDto,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  ValidateTokenDto,
  TokenPayloadDto,
} from '../dto';

const DEFAULT_TIMEOUT = 5000; // 5 seconds

@Injectable()
export class IdentityClientService implements OnModuleInit {
  private readonly logger = new Logger(IdentityClientService.name);

  constructor(
    @Inject(SERVICES.IDENTITY)
    private readonly client: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Connected to Identity Service');
    } catch (error) {
      this.logger.error('Failed to connect to Identity Service:', error);
    }
  }

  private async send<T>(pattern: string, data: unknown): Promise<T> {
    return firstValueFrom(
      this.client.send<T>(pattern, data).pipe(
        timeout(DEFAULT_TIMEOUT),
        catchError((error) => {
          this.logger.error(`RPC call failed: ${pattern}`, error);
          throw error;
        }),
      ),
    );
  }

  // ==================== Auth Methods ====================

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    return this.send(IDENTITY_PATTERNS.LOGIN, dto);
  }

  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    return this.send(IDENTITY_PATTERNS.REGISTER, dto);
  }

  async validateToken(dto: ValidateTokenDto): Promise<TokenPayloadDto | null> {
    return this.send(IDENTITY_PATTERNS.VALIDATE_TOKEN, dto);
  }

  async validateUser(username: string, password: string): Promise<UserDto | null> {
    return this.send(IDENTITY_PATTERNS.VALIDATE_USER, { username, password });
  }

  // ==================== User Methods ====================

  async getUser(id: number): Promise<UserDto | null> {
    return this.send(IDENTITY_PATTERNS.GET_USER, { id });
  }

  async getUsers(query: PaginationQueryDto = {}): Promise<PaginatedResponseDto<UserDto>> {
    return this.send(IDENTITY_PATTERNS.GET_USERS, query);
  }

  async getUserByUsername(username: string): Promise<UserDto | null> {
    return this.send(IDENTITY_PATTERNS.GET_USER_BY_USERNAME, { username });
  }

  async createUser(dto: CreateUserDto): Promise<UserDto> {
    return this.send(IDENTITY_PATTERNS.CREATE_USER, dto);
  }

  async updateUser(id: number, dto: UpdateUserDto): Promise<UserDto> {
    return this.send(IDENTITY_PATTERNS.UPDATE_USER, { id, dto });
  }

  async deleteUser(id: number): Promise<void> {
    return this.send(IDENTITY_PATTERNS.DELETE_USER, { id });
  }

  // ==================== Manager Methods ====================

  async getManagers(availableOnly = false): Promise<UserDto[]> {
    return this.send(IDENTITY_PATTERNS.GET_MANAGERS, { availableOnly });
  }

  async getOptimalManager(criteria: AutoAssignCriteriaDto): Promise<UserDto | null> {
    return this.send(IDENTITY_PATTERNS.GET_OPTIMAL_MANAGER, criteria);
  }

  async updateWorkload(dto: UpdateWorkloadDto): Promise<UserDto> {
    return this.send(IDENTITY_PATTERNS.UPDATE_WORKLOAD, dto);
  }

  // ==================== Health Check ====================

  async healthCheck(): Promise<{ status: string; service: string; timestamp: string }> {
    return this.send(IDENTITY_PATTERNS.HEALTH_CHECK, {});
  }
}
