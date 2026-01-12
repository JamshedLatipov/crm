import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomFieldDefinition } from './entities/custom-field-definition.entity';
import { CustomFieldsService } from './services/custom-fields.service';
import { CustomFieldsController } from './controllers/custom-fields.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([CustomFieldDefinition]), UserModule],
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
