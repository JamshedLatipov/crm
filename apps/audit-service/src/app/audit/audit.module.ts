import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditSettings, AuditRetention } from './entities/audit-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, AuditSettings, AuditRetention]),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
