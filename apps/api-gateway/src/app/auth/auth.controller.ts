import {
  Controller,
  Post,
  Body,
  Inject,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import {
  SERVICES,
  IDENTITY_PATTERNS,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
} from '@crm/contracts';
import {
  LoginRequestDto,
  LoginSuccessResponseDto,
  RegisterRequestDto,
  ValidateTokenRequestDto,
  ValidateTokenResponseDto,
} from '../dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject(SERVICES.IDENTITY) private readonly identityClient: ClientProxy,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login', description: 'Authenticate user and receive JWT token' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    try {
      const result = await firstValueFrom(
        this.identityClient.send<LoginResponseDto>(IDENTITY_PATTERNS.LOGIN, dto).pipe(
          timeout(5000),
          catchError(err => {
            this.logger.error('Login failed:', err);
            throw new UnauthorizedException('Invalid credentials');
          })
        )
      );
      
      if (!result) {
        throw new UnauthorizedException('Invalid credentials');
      }
      
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Login error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user', description: 'Create a new user account' })
  @ApiBody({ type: RegisterRequestDto })
  @ApiResponse({ status: 201, description: 'User registered successfully', type: LoginSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error or user already exists' })
  async register(@Body() dto: RegisterDto): Promise<LoginResponseDto> {
    try {
      const result = await firstValueFrom(
        this.identityClient.send<LoginResponseDto>(IDENTITY_PATTERNS.REGISTER, dto).pipe(
          timeout(5000),
          catchError(err => {
            this.logger.error('Registration failed:', err);
            throw err;
          })
        )
      );
      
      return result;
    } catch (error) {
      this.logger.error('Register error:', error);
      throw error;
    }
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate token', description: 'Check if a JWT token is valid' })
  @ApiBody({ type: ValidateTokenRequestDto })
  @ApiResponse({ status: 200, description: 'Token validation result', type: ValidateTokenResponseDto })
  async validateToken(@Body() body: { token: string }) {
    try {
      const result = await firstValueFrom(
        this.identityClient.send(IDENTITY_PATTERNS.VALIDATE_TOKEN, { token: body.token }).pipe(
          timeout(3000),
          catchError(() => {
            throw new UnauthorizedException('Invalid token');
          })
        )
      );
      
      return { valid: !!result, payload: result };
    } catch {
      return { valid: false, payload: null };
    }
  }
}
