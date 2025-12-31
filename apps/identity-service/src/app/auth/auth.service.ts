import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../user/entities/user.entity';
import {
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  TokenPayloadDto,
  ValidateTokenDto,
  ServiceTokenDto,
  SERVICE_AUTH,
  JWT_CONFIG,
} from '@crm/contracts';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { username } });
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.validateUser(dto.username, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    // Update last active
    user.lastActiveAt = new Date();
    await this.userRepo.save(user);

    const payload: TokenPayloadDto = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        username: user.username,
        roles: user.roles,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      },
    };
  }

  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    const existing = await this.userRepo.findOne({ where: { username: dto.username } });
    if (existing) {
      throw new UnauthorizedException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      username: dto.username,
      password: hashedPassword,
      roles: dto.roles,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
    });
    const saved = await this.userRepo.save(user);

    const payload: TokenPayloadDto = {
      sub: saved.id,
      username: saved.username,
      roles: saved.roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: saved.id,
        username: saved.username,
        roles: saved.roles,
        firstName: saved.firstName || undefined,
        lastName: saved.lastName || undefined,
      },
    };
  }

  async validateToken(dto: ValidateTokenDto): Promise<TokenPayloadDto | null> {
    try {
      const payload = this.jwtService.verify<TokenPayloadDto>(dto.token);
      
      // Verify user still exists and is active
      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
        select: ['id', 'isActive', 'deletedAt'],
      });

      if (!user || !user.isActive || user.deletedAt) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Generate a service-to-service token
   * Used by other microservices to authenticate with this service
   */
  generateServiceToken(serviceName: string, permissions: string[]): string {
    const payload: ServiceTokenDto = {
      service: serviceName,
      permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
    };

    return this.jwtService.sign(payload, {
      expiresIn: JWT_CONFIG.serviceTokenExpiresIn,
    });
  }

  /**
   * Validate a service-to-service token
   */
  validateServiceToken(token: string, requiredPermission?: string): ServiceTokenDto | null {
    try {
      const payload = this.jwtService.verify<ServiceTokenDto>(token);
      
      if (requiredPermission && !payload.permissions.includes(requiredPermission)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}
