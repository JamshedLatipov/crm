import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from './user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RolesGuard } from './roles.guard';
import { PsAuth } from '../calls/entities/ps-auth.entity';
import { PsEndpoint } from '../calls/entities/ps-endpoint.entity';

@Module({
  imports: [
  TypeOrmModule.forFeature([User, PsAuth, PsEndpoint]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, RolesGuard],
  controllers: [AuthController],
  exports: [AuthService],
})
export class UserModule {}
