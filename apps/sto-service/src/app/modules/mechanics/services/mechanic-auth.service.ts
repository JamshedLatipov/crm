import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MechanicSession } from '@libs/shared/sto-types';
import { MechanicService } from './mechanic.service';

@Injectable()
export class MechanicAuthService {
  constructor(
    @InjectRepository(MechanicSession)
    private sessionRepository: Repository<MechanicSession>,
    private mechanicService: MechanicService,
  ) {}

  async authenticateWithPin(pin: string, deviceInfo?: string): Promise<{ mechanic: any; sessionToken: string }> {
    const hashedPin = await bcrypt.hash(pin, 10);
    const mechanic = await this.mechanicService.findByPin(hashedPin);

    if (!mechanic) {
      throw new UnauthorizedException('Invalid PIN');
    }

    // Force logout existing sessions (single-session enforcement)
    await this.sessionRepository.update(
      { mechanicId: mechanic.id, isActive: true },
      { isActive: false }
    );

    // Create new session
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 8); // 8-hour session

    const session = this.sessionRepository.create({
      mechanicId: mechanic.id,
      sessionToken,
      expiresAt,
      deviceInfo,
    });

    await this.sessionRepository.save(session);

    return {
      mechanic: {
        id: mechanic.id,
        name: mechanic.name,
        specializations: mechanic.specializations,
      },
      sessionToken,
    };
  }

  async validateSession(sessionToken: string): Promise<MechanicSession | null> {
    const session = await this.sessionRepository.findOne({
      where: { sessionToken, isActive: true },
      relations: ['mechanic'],
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session;
  }

  async logout(sessionToken: string): Promise<void> {
    await this.sessionRepository.update(
      { sessionToken },
      { isActive: false }
    );
  }

  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) +
           Date.now().toString(36);
  }
}
