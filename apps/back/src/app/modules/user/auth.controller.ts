import { Controller, Post, Body, ForbiddenException, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  async login(@Body() body: LoginDto, @Req() request: Request) {
    const user = await this.authService.validateUser(
      body.username,
      body.password
    );
    if (!user) throw new ForbiddenException('Invalid credentials');
    return this.authService.login(user, request);
  }

  @Post('register')
  @ApiBody({ type: RegisterDto })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }
}
