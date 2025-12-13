import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ConfirmActionData {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  showInput?: boolean;
  inputLabel?: string;
  inputType?: string;
  inputValue?: any;
}

@Component({
  selector: 'app-confirm-action-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title class="cad-title">
      {{ data.title || 'Подтвердите действие' }}
    </h2>

    <mat-dialog-content class="cad-content">
      <p class="cad-message">{{ data.message || '' }}</p>

      <div *ngIf="data.showInput" class="cad-input">
        <mat-form-field appearance="outline" class="cad-form-field">
          <mat-label>{{ data.inputLabel || 'Значение' }}</mat-label>
          <input
            matInput
            [type]="data.inputType || 'text'"
            [formControl]="inputControl"
          />
        </mat-form-field>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="cad-actions">
      <button mat-button (click)="onCancel()">
        {{ data.cancelText || 'Отмена' }}
      </button>
      <button
        mat-flat-button
        [color]="data.confirmColor || 'primary'"
        (click)="onConfirm()"
        cdkFocusInitial
      >
        {{ data.confirmText || 'Подтвердить' }}
      </button>
    </mat-dialog-actions>
  `,
  styleUrls: ['./confirm-action-dialog.component.scss'],
})
export class ConfirmActionDialogComponent {
  inputControl: FormControl;

  constructor(
    public dialogRef: MatDialogRef<ConfirmActionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmActionData
  ) {
    this.inputControl = new FormControl(this.data?.inputValue ?? '');
  }

  onConfirm() {
    this.dialogRef.close({
      confirmed: true,
      value: this.data.showInput ? this.inputControl.value : undefined,
    });
  }

  onCancel() {
    this.dialogRef.close({ confirmed: false });
  }
}
