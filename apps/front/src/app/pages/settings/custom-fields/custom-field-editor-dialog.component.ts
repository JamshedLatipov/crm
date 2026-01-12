import { Component, Inject, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  FormArray,
} from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatStepperModule } from '@angular/material/stepper';
import { CustomFieldsService } from '../../../services/custom-fields.service';
import {
  CustomFieldDefinition,
  EntityType,
  FieldType,
} from '../../../models/custom-field.model';

@Component({
  selector: 'app-custom-field-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    MatChipsModule,
    MatStepperModule,
  ],
  templateUrl: './custom-field-editor-dialog.component.html',
  styleUrls: ['./custom-field-editor-dialog.component.scss'],
})
export class CustomFieldEditorDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly customFieldsService = inject(CustomFieldsService);
  private readonly dialogRef = inject(MatDialogRef<CustomFieldEditorDialogComponent>);

  basicInfoForm: FormGroup;
  validationForm: FormGroup;
  displayForm: FormGroup;
  selectOptionsForm: FormGroup;

  isEditMode = false;
  loading = signal(false);

  fieldTypes: Array<{ value: FieldType; label: string }> = [
    { value: 'text', label: 'Текст' },
    { value: 'number', label: 'Число' },
    { value: 'date', label: 'Дата' },
    { value: 'boolean', label: 'Да/Нет' },
    { value: 'select', label: 'Выбор' },
    { value: 'multiselect', label: 'Множественный выбор' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Телефон' },
    { value: 'url', label: 'URL' },
    { value: 'textarea', label: 'Многострочный текст' },
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { field?: CustomFieldDefinition; entityType: EntityType }
  ) {
    this.isEditMode = !!data.field;

    this.basicInfoForm = this.fb.group({
      name: [
        data.field?.name || '',
        [Validators.required, Validators.pattern(/^[a-z_][a-z0-9_]*$/)],
      ],
      label: [data.field?.label || '', Validators.required],
      fieldType: [data.field?.fieldType || 'text', Validators.required],
      defaultValue: [data.field?.defaultValue || ''],
    });

    this.validationForm = this.fb.group({
      required: [false],
      minLength: [''],
      maxLength: [''],
      min: [''],
      max: [''],
      pattern: [''],
    });

    this.displayForm = this.fb.group({
      description: [data.field?.displayConfig?.description || ''],
      placeholder: [data.field?.displayConfig?.placeholder || ''],
      icon: [data.field?.displayConfig?.icon || ''],
      helpText: [data.field?.displayConfig?.helpText || ''],
      showInList: [data.field?.displayConfig?.showInList ?? true],
      showInDetail: [data.field?.displayConfig?.showInDetail ?? true],
      showInFilters: [data.field?.displayConfig?.showInFilters ?? true],
    });

    this.selectOptionsForm = this.fb.group({
      options: this.fb.array([]),
    });

    if (data.field?.validationRules) {
      this.loadValidationRules(data.field.validationRules);
    }

    if (data.field?.selectOptions) {
      this.loadSelectOptions(data.field.selectOptions);
    }
  }

  ngOnInit(): void {
    // Add at least one option for select/multiselect fields
    this.basicInfoForm.get('fieldType')?.valueChanges.subscribe((type) => {
      if (
        (type === 'select' || type === 'multiselect') &&
        this.optionsArray.length === 0
      ) {
        this.addOption();
      }
    });
  }

  get optionsArray(): FormArray {
    return this.selectOptionsForm.get('options') as FormArray;
  }

  get isSelectType(): boolean {
    const type = this.basicInfoForm.get('fieldType')?.value;
    return type === 'select' || type === 'multiselect';
  }

  addOption(): void {
    this.optionsArray.push(
      this.fb.group({
        value: ['', Validators.required],
        label: ['', Validators.required],
        color: [''],
      })
    );
  }

  removeOption(index: number): void {
    this.optionsArray.removeAt(index);
  }

  loadValidationRules(rules: any[]): void {
    rules.forEach((rule) => {
      if (rule.type === 'required') {
        this.validationForm.patchValue({ required: true });
      } else if (rule.value !== undefined) {
        this.validationForm.patchValue({ [rule.type]: rule.value });
      }
    });
  }

  loadSelectOptions(options: any[]): void {
    options.forEach((option) => {
      this.optionsArray.push(
        this.fb.group({
          value: [option.value, Validators.required],
          label: [option.label, Validators.required],
          color: [option.color || ''],
        })
      );
    });
  }

  buildValidationRules(): any[] {
    const rules: any[] = [];
    const formValue = this.validationForm.value;

    if (formValue.required) {
      rules.push({ type: 'required' });
    }
    if (formValue.minLength) {
      rules.push({ type: 'minLength', value: Number(formValue.minLength) });
    }
    if (formValue.maxLength) {
      rules.push({ type: 'maxLength', value: Number(formValue.maxLength) });
    }
    if (formValue.min) {
      rules.push({ type: 'min', value: Number(formValue.min) });
    }
    if (formValue.max) {
      rules.push({ type: 'max', value: Number(formValue.max) });
    }
    if (formValue.pattern) {
      rules.push({ type: 'pattern', value: formValue.pattern });
    }

    return rules;
  }

  onSubmit(): void {
    if (
      !this.basicInfoForm.valid ||
      !this.displayForm.valid ||
      (this.isSelectType && !this.selectOptionsForm.valid)
    ) {
      return;
    }

    this.loading.set(true);

    const basicInfo = this.basicInfoForm.value;
    const displayInfo = this.displayForm.value;

    const dto = {
      entityType: this.data.entityType,
      name: basicInfo.name,
      label: basicInfo.label,
      fieldType: basicInfo.fieldType,
      defaultValue: basicInfo.defaultValue || undefined,
      validationRules: this.buildValidationRules(),
      selectOptions: this.isSelectType
        ? this.optionsArray.value
        : undefined,
      displayConfig: {
        label: basicInfo.label,
        description: displayInfo.description || undefined,
        placeholder: displayInfo.placeholder || undefined,
        icon: displayInfo.icon || undefined,
        helpText: displayInfo.helpText || undefined,
        showInList: displayInfo.showInList,
        showInDetail: displayInfo.showInDetail,
        showInFilters: displayInfo.showInFilters,
      },
      isActive: true,
    };

    const request = this.isEditMode
      ? this.customFieldsService.update(this.data.field!.id, dto)
      : this.customFieldsService.create(dto);

    request.subscribe({
      next: (result) => {
        this.loading.set(false);
        this.dialogRef.close(result);
      },
      error: (error) => {
        console.error('Error saving custom field:', error);
        this.loading.set(false);
        alert('Ошибка при сохранении поля: ' + (error.error?.message || error.message));
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
