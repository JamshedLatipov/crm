import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CustomFieldDefinition,
  EntityType,
  ValidationRule,
} from '../entities/custom-field-definition.entity';
import { CreateCustomFieldDefinitionDto } from '../dto/create-custom-field-definition.dto';
import { UpdateCustomFieldDefinitionDto } from '../dto/update-custom-field-definition.dto';

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectRepository(CustomFieldDefinition)
    private readonly customFieldRepo: Repository<CustomFieldDefinition>
  ) {}

  async create(
    dto: CreateCustomFieldDefinitionDto
  ): Promise<CustomFieldDefinition> {
    // Check for unique name
    const existing = await this.customFieldRepo.findOne({
      where: { name: dto.name, entityType: dto.entityType },
    });
    if (existing) {
      throw new ConflictException(
        `Custom field with name "${dto.name}" already exists for ${dto.entityType}`
      );
    }

    // Validate select options for select/multiselect types
    if (
      (dto.fieldType === 'select' || dto.fieldType === 'multiselect') &&
      (!dto.selectOptions || dto.selectOptions.length === 0)
    ) {
      throw new BadRequestException(
        'Select options are required for select/multiselect field types'
      );
    }

    const fieldDef = this.customFieldRepo.create(dto);
    return await this.customFieldRepo.save(fieldDef);
  }

  async findAll(entityType?: EntityType): Promise<CustomFieldDefinition[]> {
    const query = this.customFieldRepo.createQueryBuilder('field');

    if (entityType) {
      query.where('field.entityType = :entityType', { entityType });
    }

    query.orderBy('field.sortOrder', 'ASC').addOrderBy('field.createdAt', 'ASC');

    return await query.getMany();
  }

  async findByEntity(entityType: EntityType): Promise<CustomFieldDefinition[]> {
    return await this.customFieldRepo.find({
      where: { entityType, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<CustomFieldDefinition> {
    const fieldDef = await this.customFieldRepo.findOne({ where: { id } });
    if (!fieldDef) {
      throw new NotFoundException(`Custom field definition with ID ${id} not found`);
    }
    return fieldDef;
  }

  async update(
    id: string,
    dto: UpdateCustomFieldDefinitionDto
  ): Promise<CustomFieldDefinition> {
    const fieldDef = await this.findOne(id);

    // Check for unique name if name is being changed
    if (dto.name && dto.name !== fieldDef.name) {
      const existing = await this.customFieldRepo.findOne({
        where: { name: dto.name, entityType: fieldDef.entityType },
      });
      if (existing) {
        throw new ConflictException(
          `Custom field with name "${dto.name}" already exists`
        );
      }
    }

    Object.assign(fieldDef, dto);
    return await this.customFieldRepo.save(fieldDef);
  }

  async remove(id: string): Promise<void> {
    const fieldDef = await this.findOne(id);
    await this.customFieldRepo.remove(fieldDef);
  }

  async updateSortOrder(
    updates: Array<{ id: string; sortOrder: number }>
  ): Promise<void> {
    await Promise.all(
      updates.map((update) =>
        this.customFieldRepo.update(update.id, { sortOrder: update.sortOrder })
      )
    );
  }

  /**
   * Validate custom field values against definitions
   */
  async validateCustomFields(
    entityType: EntityType,
    customFields: Record<string, any>
  ): Promise<{ isValid: boolean; errors: Record<string, string[]> }> {
    const definitions = await this.findByEntity(entityType);
    const errors: Record<string, string[]> = {};

    for (const def of definitions) {
      const value = customFields[def.name];
      const fieldErrors: string[] = [];

      if (def.validationRules) {
        for (const rule of def.validationRules) {
          const error = this.validateRule(value, rule, def);
          if (error) {
            fieldErrors.push(error);
          }
        }
      }

      // Type validation
      const typeError = this.validateType(value, def);
      if (typeError) {
        fieldErrors.push(typeError);
      }

      if (fieldErrors.length > 0) {
        errors[def.name] = fieldErrors;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  private validateRule(
    value: any,
    rule: ValidationRule,
    def: CustomFieldDefinition
  ): string | null {
    if (rule.type === 'required' && (value === null || value === undefined || value === '')) {
      return rule.message || `${def.label} is required`;
    }

    if (value === null || value === undefined || value === '') {
      return null; // Skip other validations if value is empty
    }

    switch (rule.type) {
      case 'minLength':
        if (typeof value === 'string' && value.length < rule.value) {
          return (
            rule.message ||
            `${def.label} must be at least ${rule.value} characters`
          );
        }
        break;
      case 'maxLength':
        if (typeof value === 'string' && value.length > rule.value) {
          return (
            rule.message ||
            `${def.label} must be at most ${rule.value} characters`
          );
        }
        break;
      case 'min':
        if (typeof value === 'number' && value < rule.value) {
          return rule.message || `${def.label} must be at least ${rule.value}`;
        }
        break;
      case 'max':
        if (typeof value === 'number' && value > rule.value) {
          return rule.message || `${def.label} must be at most ${rule.value}`;
        }
        break;
      case 'pattern':
        if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
          return rule.message || `${def.label} format is invalid`;
        }
        break;
      case 'email':
        if (
          typeof value === 'string' &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          return rule.message || `${def.label} must be a valid email`;
        }
        break;
      case 'url':
        try {
          new URL(value);
        } catch {
          return rule.message || `${def.label} must be a valid URL`;
        }
        break;
    }

    return null;
  }

  private validateType(
    value: any,
    def: CustomFieldDefinition
  ): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    switch (def.fieldType) {
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return `${def.label} must be a number`;
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${def.label} must be a boolean`;
        }
        break;
      case 'date':
        if (isNaN(Date.parse(value))) {
          return `${def.label} must be a valid date`;
        }
        break;
      case 'select':
        if (
          def.selectOptions &&
          !def.selectOptions.some((opt) => opt.value === value)
        ) {
          return `${def.label} must be one of the available options`;
        }
        break;
      case 'multiselect':
        if (!Array.isArray(value)) {
          return `${def.label} must be an array`;
        }
        if (
          def.selectOptions &&
          value.some((v) => !def.selectOptions!.some((opt) => opt.value === v))
        ) {
          return `${def.label} contains invalid options`;
        }
        break;
    }

    return null;
  }
}
