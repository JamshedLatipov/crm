import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { User } from './user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { RolesGuard } from './roles.guard';
import { JwtStrategy } from './jwt.strategy';
import { PsAuth } from '../calls/entities/ps-auth.entity';
import { PsEndpoint } from '../calls/entities/ps-endpoint.entity';
import { UserActivityModule } from '../user-activity/user-activity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PsAuth, PsEndpoint]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1d' },
    }),
    UserActivityModule,
  ],
  providers: [AuthService, UserService, RolesGuard, JwtStrategy],
  controllers: [AuthController, UserController],
  exports: [AuthService, UserService, JwtModule, PassportModule, JwtStrategy],
})
export class UserModule {}
