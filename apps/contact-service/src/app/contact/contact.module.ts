import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { ContactActivity } from './entities/contact-activity.entity';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, ContactActivity])],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
