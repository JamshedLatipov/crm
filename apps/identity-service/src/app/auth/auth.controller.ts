import { Controller, Post, Body, Logger, HttpCode, HttpStatus, Param, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import {
  IDENTITY_PATTERNS,
  LoginDto,
  RegisterDto,
  ValidateTokenDto,
  ValidateServiceTokenDto,
} from '@crm/contracts';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // ==================== HTTP Endpoints ====================

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body('userId') userId: number) {
    return this.authService.logout(userId);
  }

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Body() dto: ValidateTokenDto) {
    const payload = await this.authService.validateToken(dto);
    return { valid: !!payload, payload };
  }

  // ==================== Microservice Patterns (RabbitMQ) ====================

  @MessagePattern(IDENTITY_PATTERNS.VALIDATE_USER)
  async handleValidateUser(@Payload() data: { username: string; password: string }) {
    this.logger.debug(`RPC: VALIDATE_USER username=${data.username}`);
    const user = await this.authService.validateUser(data.username, data.password);
    if (!user) return null;
    const { password, ...result } = user;
    return result;
  }

  @MessagePattern(IDENTITY_PATTERNS.LOGIN)
  async handleLogin(@Payload() dto: LoginDto) {
    this.logger.debug(`RPC: LOGIN username=${dto.username}`);
    return this.authService.login(dto);
  }

  @MessagePattern(IDENTITY_PATTERNS.LOGOUT)
  async handleLogout(@Payload() data: { userId: number }) {
    this.logger.debug(`RPC: LOGOUT userId=${data.userId}`);
    return this.authService.logout(data.userId);
  }

  @MessagePattern(IDENTITY_PATTERNS.REGISTER)
  async handleRegister(@Payload() dto: RegisterDto) {
    this.logger.debug(`RPC: REGISTER username=${dto.username}`);
    return this.authService.register(dto);
  }

  @MessagePattern(IDENTITY_PATTERNS.VALIDATE_TOKEN)
  async handleValidateToken(@Payload() dto: ValidateTokenDto) {
    this.logger.debug(`RPC: VALIDATE_TOKEN`);
    return this.authService.validateToken(dto);
  }

  @MessagePattern('identity.auth.generateServiceToken')
  async handleGenerateServiceToken(@Payload() data: { serviceName: string; permissions: string[] }) {
    this.logger.debug(`RPC: GENERATE_SERVICE_TOKEN service=${data.serviceName}`);
    return { token: this.authService.generateServiceToken(data.serviceName, data.permissions) };
  }

  @MessagePattern('identity.auth.validateServiceToken')
  async handleValidateServiceToken(@Payload() dto: ValidateServiceTokenDto) {
    this.logger.debug(`RPC: VALIDATE_SERVICE_TOKEN`);
    return this.authService.validateServiceToken(dto.token, dto.requiredPermission);
  }
}
