import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div style="padding:16px; max-width:360px">
      <h3 style="margin:0 0 8px 0">{{data.title || 'Confirm'}}</h3>
      <p style="margin:0 0 16px 0">{{data.message || 'Are you sure?'}}</p>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-button color="warn" (click)="onConfirm()">Yes</button>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  constructor(public dialogRef: MatDialogRef<ConfirmDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {}
  onConfirm() { this.dialogRef.close(true); }
  onCancel() { this.dialogRef.close(false); }
}
