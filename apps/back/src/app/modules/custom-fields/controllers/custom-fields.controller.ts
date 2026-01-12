import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../user/jwt-auth.guard';
import { CustomFieldsService } from '../services/custom-fields.service';
import { CreateCustomFieldDefinitionDto } from '../dto/create-custom-field-definition.dto';
import { UpdateCustomFieldDefinitionDto } from '../dto/update-custom-field-definition.dto';
import { EntityType } from '../entities/custom-field-definition.entity';

@Controller('custom-fields')
@UseGuards(JwtAuthGuard)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Post()
  async create(@Body() dto: CreateCustomFieldDefinitionDto) {
    return await this.customFieldsService.create(dto);
  }

  @Get()
  async findAll(@Query('entityType') entityType?: EntityType) {
    return await this.customFieldsService.findAll(entityType);
  }

  @Get('entity/:entityType')
  async findByEntity(@Param('entityType') entityType: EntityType) {
    return await this.customFieldsService.findByEntity(entityType);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.customFieldsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDefinitionDto
  ) {
    return await this.customFieldsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.customFieldsService.remove(id);
    return { message: 'Custom field definition deleted successfully' };
  }

  @Patch('sort-order')
  async updateSortOrder(
    @Body() updates: Array<{ id: string; sortOrder: number }>
  ) {
    await this.customFieldsService.updateSortOrder(updates);
    return { message: 'Sort order updated successfully' };
  }

  @Post('validate')
  async validate(
    @Body() body: { entityType: EntityType; customFields: Record<string, any> }
  ) {
    return await this.customFieldsService.validateCustomFields(
      body.entityType,
      body.customFields
    );
  }
}
