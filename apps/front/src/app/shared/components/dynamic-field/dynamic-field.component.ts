import {
  Component,
  input,
  output,
  OnInit,
  inject,
  effect,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import {
  CustomFieldDefinition,
  ValidationRule,
} from '../../../models/custom-field.model';

@Component({
  selector: 'app-dynamic-field',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  templateUrl: './dynamic-field.component.html',
  styleUrls: ['./dynamic-field.component.scss'],
})
export class DynamicFieldComponent implements OnInit {
  fieldDef = input.required<CustomFieldDefinition>();
  value = input<any>();
  disabled = input(false);
  readonly = input(false);

  valueChange = output<any>();
  validationError = output<string | null>();

  control = signal<FormControl>(new FormControl());
  errorMessage = signal<string | null>(null);

  constructor() {
    // Watch for field definition changes
    effect(() => {
      const def = this.fieldDef();
      const currentValue = this.value();

      // Build validators
      const validators = this.buildValidators(def.validationRules);
      const newControl = new FormControl(
        { value: currentValue || def.defaultValue || null, disabled: this.disabled() },
        validators
      );

      this.control.set(newControl);

      // Listen to value changes
      newControl.valueChanges.subscribe((val) => {
        this.valueChange.emit(val);
        this.updateErrorMessage();
      });

      // Listen to status changes
      newControl.statusChanges.subscribe(() => {
        this.updateErrorMessage();
      });
    });
  }

  ngOnInit(): void {
    // Initial validation
    setTimeout(() => this.updateErrorMessage(), 0);
  }

  private buildValidators(rules?: ValidationRule[]): any[] {
    if (!rules || rules.length === 0) return [];

    const validators: any[] = [];

    rules.forEach((rule) => {
      switch (rule.type) {
        case 'required':
          validators.push(Validators.required);
          break;
        case 'minLength':
          if (rule.value) validators.push(Validators.minLength(rule.value));
          break;
        case 'maxLength':
          if (rule.value) validators.push(Validators.maxLength(rule.value));
          break;
        case 'min':
          if (rule.value !== undefined) validators.push(Validators.min(rule.value));
          break;
        case 'max':
          if (rule.value !== undefined) validators.push(Validators.max(rule.value));
          break;
        case 'pattern':
          if (rule.value) validators.push(Validators.pattern(rule.value));
          break;
        case 'email':
          validators.push(Validators.email);
          break;
      }
    });

    return validators;
  }

  private updateErrorMessage(): void {
    const ctrl = this.control();
    if (ctrl.invalid && (ctrl.dirty || ctrl.touched)) {
      const errors = ctrl.errors;
      if (errors) {
        const def = this.fieldDef();
        let message = '';

        if (errors['required']) {
          message = `${def.label} обязательно для заполнения`;
        } else if (errors['minlength']) {
          message = `Минимальная длина: ${errors['minlength'].requiredLength}`;
        } else if (errors['maxlength']) {
          message = `Максимальная длина: ${errors['maxlength'].requiredLength}`;
        } else if (errors['min']) {
          message = `Минимальное значение: ${errors['min'].min}`;
        } else if (errors['max']) {
          message = `Максимальное значение: ${errors['max'].max}`;
        } else if (errors['pattern']) {
          message = `Неверный формат`;
        } else if (errors['email']) {
          message = `Введите корректный email`;
        }

        // Check for custom message in validation rules
        const matchingRule = def.validationRules?.find(
          (rule) => errors[rule.type]
        );
        if (matchingRule?.message) {
          message = matchingRule.message;
        }

        this.errorMessage.set(message);
        this.validationError.emit(message);
      } else {
        this.errorMessage.set(null);
        this.validationError.emit(null);
      }
    } else {
      this.errorMessage.set(null);
      this.validationError.emit(null);
    }
  }

  getOptionColor(value: string): string | undefined {
    const def = this.fieldDef();
    if (def.selectOptions) {
      const option = def.selectOptions.find((opt) => opt.value === value);
      return option?.color;
    }
    return undefined;
  }

  getOptionLabel(value: string): string {
    const def = this.fieldDef();
    if (def.selectOptions) {
      const option = def.selectOptions.find((opt) => opt.value === value);
      return option?.label || value;
    }
    return value;
  }

  onChipRemove(value: string): void {
    const ctrl = this.control();
    const currentValue = ctrl.value as string[];
    if (Array.isArray(currentValue)) {
      const newValue = currentValue.filter((v) => v !== value);
      ctrl.setValue(newValue);
    }
  }
}
