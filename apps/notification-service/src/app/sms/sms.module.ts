import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { SmsMessage } from './entities/sms-message.entity';
import { SmsTemplate } from './entities/sms-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SmsMessage, SmsTemplate])],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
