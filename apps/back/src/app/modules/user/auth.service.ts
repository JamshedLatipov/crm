import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { PsAuth } from '../calls/entities/ps-auth.entity';
import { PsEndpoint } from '../calls/entities/ps-endpoint.entity';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UserActivityService } from '../user-activity/user-activity.service';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
  @InjectRepository(User)
  private readonly userRepo: Repository<User>,
  @InjectRepository(PsAuth)
  private readonly psAuthRepo: Repository<PsAuth>,
  @InjectRepository(PsEndpoint)
  private readonly psEndpointRepo: Repository<PsEndpoint>,
    private readonly jwtService: JwtService,
    private readonly userActivityService: UserActivityService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
  // Load related SIP endpoint (relation property is 'sipEndpoint', not the FK column 'sipEndpointId')
  const user = await this.userRepo.findOne({ where: { username }, relations: ['sipEndpoint'] });
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async login(user: User, request?: Request) {
    // Attempt to resolve SIP auth credentials (if endpoint linked & has auth ref)
    let sip: { username?: string; password?: string } | undefined;
    if (user.sipEndpointId) {
      const endpoint = await this.psEndpointRepo.findOne({ where: { id: user.sipEndpointId } });
      const authId = endpoint?.auth;
      if (authId) {
        const auth = await this.psAuthRepo.findOne({ where: { id: authId } });
        if (auth) sip = { username: auth.username, password: auth.password };
      }
    }

    // Log login activity
    if (request) {
      await this.userActivityService.logLogin(
        user.id.toString(),
        request.ip,
        request.get('User-Agent'),
      );
    }

    // Build an explicit operator object to include in the JWT payload.
    // This expands the token with SIP provisioning info (when available):
    // - username/password (for JsSIP client provisioning)
    // - authId (ps_auths.id) and endpointId (user.sipEndpointId) for tracing
    const operator = sip
      ? {
          username: sip.username,
          password: sip.password,
          authId: sip && (await (async () => {
            try {
              // If we resolved auth earlier, include its id when possible
              const endpoint = user.sipEndpointId ? await this.psEndpointRepo.findOne({ where: { id: user.sipEndpointId } }) : undefined;
              const authRec = endpoint?.auth ? await this.psAuthRepo.findOne({ where: { id: endpoint.auth } }) : undefined;
              return authRec?.id || null;
            } catch {
              return null;
            }
          })()) ,
          endpointId: user.sipEndpointId || null,
        }
      : null;
    const payload = { username: user.username, sub: user.id, roles: user.roles, operator };
    return {
      access_token: this.jwtService.sign(payload),
      sip,
    };
  }

  async register(data: { username: string; password: string; roles: string[] }) {
    const hash = await bcrypt.hash(data.password, 10);
    const user = this.userRepo.create({ ...data, password: hash });
    return this.userRepo.save(user);
  }

  async logout(user: User, request?: Request) {
    // Log logout activity
    if (request) {
      await this.userActivityService.logLogout(user.id.toString());
    }

    return { message: 'Successfully logged out' };
  }
}
