import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'email'
  | 'phone'
  | 'url'
  | 'textarea';

export type EntityType = 'contact' | 'lead' | 'deal' | 'company';

export interface ValidationRule {
  type:
    | 'required'
    | 'minLength'
    | 'maxLength'
    | 'min'
    | 'max'
    | 'pattern'
    | 'email'
    | 'url'
    | 'phone';
  value?: any;
  message?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface DisplayConfig {
  label: string;
  description?: string;
  placeholder?: string;
  icon?: string;
  helpText?: string;
  showInList?: boolean;
  showInDetail?: boolean;
  showInFilters?: boolean;
}

@Entity('custom_field_definitions')
export class CustomFieldDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ['contact', 'lead', 'deal', 'company'],
  })
  entityType: EntityType;

  @Column({ unique: true })
  name: string; // Internal field key (e.g., "customer_type")

  @Column()
  label: string; // Display label (e.g., "Тип клиента")

  @Column({
    type: 'enum',
    enum: [
      'text',
      'number',
      'date',
      'boolean',
      'select',
      'multiselect',
      'email',
      'phone',
      'url',
      'textarea',
    ],
  })
  fieldType: FieldType;

  @Column('jsonb', { nullable: true })
  validationRules?: ValidationRule[];

  @Column('jsonb', { nullable: true })
  selectOptions?: SelectOption[]; // For select/multiselect types

  @Column('jsonb')
  displayConfig: DisplayConfig;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ nullable: true })
  defaultValue?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
