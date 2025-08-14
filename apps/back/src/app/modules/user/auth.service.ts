import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { PsAuth } from '../calls/entities/ps-auth.entity';
import { PsEndpoint } from '../calls/entities/ps-endpoint.entity';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
  @InjectRepository(User)
  private readonly userRepo: Repository<User>,
  @InjectRepository(PsAuth)
  private readonly psAuthRepo: Repository<PsAuth>,
  @InjectRepository(PsEndpoint)
  private readonly psEndpointRepo: Repository<PsEndpoint>,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
  // Load related SIP endpoint (relation property is 'sipEndpoint', not the FK column 'sipEndpointId')
  const user = await this.userRepo.findOne({ where: { username }, relations: ['sipEndpoint'] });
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async login(user: User) {
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
    const payload = { username: user.username, sub: user.id, roles: user.roles, operator: sip };
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
}
