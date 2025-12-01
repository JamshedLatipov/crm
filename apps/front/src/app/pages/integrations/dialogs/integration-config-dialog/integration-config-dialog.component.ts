import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { IntegrationConfig } from '../../../../integrations/services/integration.service';

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
