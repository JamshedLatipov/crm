import { Component, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { CallScriptCategory } from '../call-script-category-dialog.component';

export interface CallScript {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  category?: CallScriptCategory;
  steps: string[];
  questions: string[];
  tips: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-call-script-preview-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule
  ],
  templateUrl: './call-script-preview-dialog.component.html',
  styleUrls: ['./call-script-preview-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CallScriptPreviewDialogComponent {
  private dialogRef = inject(MatDialogRef<CallScriptPreviewDialogComponent>);
  private data = inject(MAT_DIALOG_DATA);

  script: CallScript = this.data.script;

  onClose() {
    this.dialogRef.close();
  }

  onEdit() {
    this.dialogRef.close({ action: 'edit', script: this.script });
  }

  onDelete() {
    if (confirm(`Удалить скрипт "${this.script.title}"?`)) {
      this.dialogRef.close({ action: 'delete', script: this.script });
    }
  }
}