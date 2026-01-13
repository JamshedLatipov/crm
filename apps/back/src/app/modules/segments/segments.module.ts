import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ContactSegment } from './entities/contact-segment.entity';
import { Contact } from '../contacts/contact.entity';
import { ContactSegmentService } from './services/contact-segment.service';
import { ContactSegmentController } from './controllers/contact-segment.controller';
import { UserModule } from '../user/user.module';

/**
 * Универсальный модуль сегментации контактов
 * Используется для SMS, звонков, email-рассылок и других каналов
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ContactSegment, Contact]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1d' },
    }),
    UserModule,
  ],
  controllers: [ContactSegmentController],
  providers: [ContactSegmentService],
  exports: [ContactSegmentService],
})
export class SegmentsModule {}
