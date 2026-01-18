import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { MechanicService } from '../services/mechanic.service';
import { MechanicAuthService } from '../services/mechanic-auth.service';

@Controller('sto/mechanics')
export class MechanicController {
  constructor(
    private readonly mechanicService: MechanicService,
    private readonly mechanicAuthService: MechanicAuthService,
  ) {}

  @Post('auth/pin')
  async authenticateWithPin(
    @Body() body: { pin: string; deviceInfo?: string }
  ) {
    return this.mechanicAuthService.authenticateWithPin(body.pin, body.deviceInfo);
  }

  @Get('me')
  async getCurrentMechanic(@Headers('authorization') authHeader: string) {
    const sessionToken = authHeader?.replace('Bearer ', '');
    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    const session = await this.mechanicAuthService.validateSession(sessionToken);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return session.mechanic;
  }

  @Post('logout')
  async logout(@Headers('authorization') authHeader: string) {
    const sessionToken = authHeader?.replace('Bearer ', '');
    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    await this.mechanicAuthService.logout(sessionToken);
    return { message: 'Logged out successfully' };
  }
}
