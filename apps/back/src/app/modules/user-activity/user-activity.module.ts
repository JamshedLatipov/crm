import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserActivity } from './user-activity.entity';
import { UserActivityService } from './user-activity.service';
import { UserActivityController } from './user-activity.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserActivity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [UserActivityService],
  controllers: [UserActivityController],
  exports: [UserActivityService],
})
export class UserActivityModule {}