import { Controller, Post, Body, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(
      body.username,
      body.password
    );
    if (!user) throw new ForbiddenException('Invalid credentials');
    return this.authService.login(user);
  }

  @Post('register')
  @ApiBody({ type: RegisterDto })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }
}
