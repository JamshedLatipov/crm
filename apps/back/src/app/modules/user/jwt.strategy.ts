import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUserPayload } from './current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  async validate(payload: { sub: string; username: string; roles?: string[]; iat?: number; exp?: number }): Promise<CurrentUserPayload> {
    return {
      sub: payload.sub,
      username: payload.username,
      roles: payload.roles || [],
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}