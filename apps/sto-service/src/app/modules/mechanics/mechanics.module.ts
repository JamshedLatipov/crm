import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mechanic, MechanicSession } from '@libs/shared/sto-types';
import { MechanicService } from './services/mechanic.service';
import { MechanicAuthService } from './services/mechanic-auth.service';
import { MechanicController } from './controllers/mechanic.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Mechanic, MechanicSession])],
  controllers: [MechanicController],
  providers: [MechanicService, MechanicAuthService],
  exports: [MechanicService, MechanicAuthService],
})
export class MechanicsModule {}
