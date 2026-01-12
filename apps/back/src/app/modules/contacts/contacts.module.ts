import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { Contact } from './contact.entity';
import { ContactActivity } from './contact-activity.entity';
import { CompaniesModule } from '../companies/companies.module';
import { NotificationModule } from '../notifications/notification.module';
import { ContactCenterModule } from '../contact-center/contact-center.module';
import { CustomFieldsModule } from '../custom-fields/custom-fields.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contact, ContactActivity]),
    CompaniesModule,
    NotificationModule,
    forwardRef(() => ContactCenterModule),
    CustomFieldsModule,
    SharedModule,
  ],
  providers: [ContactsService],
  controllers: [ContactsController],
  exports: [ContactsService],
})
export class ContactsModule {}
