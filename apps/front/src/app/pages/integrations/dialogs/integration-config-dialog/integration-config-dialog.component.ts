import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { IntegrationConfig } from '../../../../integrations/services/integration.service';
import { debounceTime } from 'rxjs/operators';

function jsonValidator(control: AbstractControl): ValidationErrors | null {
  try {
    JSON.parse(control.value);
    return null;
  } catch (e) {
    return { invalidJson: true };
  }
}

@Component({
  selector: 'app-integration-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule
  ],
  templateUrl: './integration-config-dialog.component.html',
  styleUrls: ['./integration-config-dialog.component.scss']
})
export class IntegrationConfigDialogComponent {
  form: FormGroup;
  isEditMode: boolean;

  parseError: string | null = null;

  // A small example payload to help users start editing
  exampleSources = `[
  {
    "type": "api",
    "name": "Example Source",
    "url": "https://api.example.com/v1/items",
    "headers": {
      "Authorization": "Bearer TOKEN_HERE"
    }
  }
]`;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<IntegrationConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IntegrationConfig | null
  ) {
    this.isEditMode = !!data;
    this.form = this.fb.group({
      id: [data?.id || null],
      name: [data?.name || '', [Validators.required]],
      isActive: [data?.isActive ?? true],
      sources: [
        data?.sources ? JSON.stringify(data.sources, null, 2) : '[]',
        [Validators.required, jsonValidator]
      ]
    });
      // Live-validate JSON with debounce to avoid noisy parsing on each keystroke
      const sourcesCtrl = this.form.get('sources');
      if (sourcesCtrl) {
        // subscribe to value changes
        (sourcesCtrl.valueChanges as any).pipe(debounceTime(350)).subscribe((v: string) => {
          if (!v || v.trim() === '') {
            this.parseError = null;
            sourcesCtrl.setErrors({ required: true });
            return;
          }

          try {
            JSON.parse(v);
            this.parseError = null;
            const errs = sourcesCtrl.errors || {};
            delete (errs as any).invalidJson;
            if (Object.keys(errs).length === 0) {
              sourcesCtrl.setErrors(null);
            } else {
              sourcesCtrl.setErrors(errs);
            }
          } catch (e: any) {
            this.parseError = e?.message || 'Invalid JSON';
            sourcesCtrl.setErrors({ ...(sourcesCtrl.errors || {}), invalidJson: true });
          }
        });
      }
  }

  formatSources() {
    const ctrl = this.form.get('sources');
    if (!ctrl) return;
    try {
      const parsed = JSON.parse(ctrl.value);
      ctrl.setValue(JSON.stringify(parsed, null, 2));
      ctrl.updateValueAndValidity();
    } catch (e) {
      // keep as-is; validator will show error
      ctrl.updateValueAndValidity();
    }
  }

  compactSources() {
    const ctrl = this.form.get('sources');
    if (!ctrl) return;
    try {
      const parsed = JSON.parse(ctrl.value);
      ctrl.setValue(JSON.stringify(parsed));
      ctrl.updateValueAndValidity();
    } catch (e) {
      ctrl.updateValueAndValidity();
    }
  }

  validateSources(): boolean {
    const ctrl = this.form.get('sources');
    if (!ctrl) return false;
    try {
      JSON.parse(ctrl.value);
      const errs = ctrl.errors || {};
      delete (errs as any).invalidJson;
      if (Object.keys(errs).length === 0) {
        ctrl.setErrors(null);
      } else {
        ctrl.setErrors(errs);
      }
      return true;
    } catch (e) {
      ctrl.setErrors({ ...(ctrl.errors || {}), invalidJson: true });
      return false;
    }
  }

  insertExample() {
    this.form.get('sources')?.setValue(this.exampleSources);
    this.form.get('sources')?.updateValueAndValidity();
  }

  // Auto-format on blur (safe noop if invalid)
  formatOnBlur() {
    this.formatSources();
  }

  async copySources() {
    try {
      const val = this.form.get('sources')?.value || '';
      await navigator.clipboard.writeText(val);
    } catch (e) {
      // ignore - clipboard may be unavailable in some contexts
    }
  }

  downloadSources() {
    const val = this.form.get('sources')?.value || '';
    const blob = new Blob([val], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `integration-sources${this.form.get('name')?.value ? '-' + this.form.get('name')?.value : ''}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      this.form.get('sources')?.setValue(text);
      this.form.get('sources')?.updateValueAndValidity();
    };
    reader.readAsText(file);
    input.value = '';
  }

  save() {
    if (this.form.valid) {
      const formValue = this.form.value;
      const result: IntegrationConfig = {
        ...formValue,
        sources: JSON.parse(formValue.sources)
      };
      
      // Remove id if it's null so TypeORM creates a new record
      if (!result.id) {
        delete result.id;
      }

      this.dialogRef.close(result);
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
