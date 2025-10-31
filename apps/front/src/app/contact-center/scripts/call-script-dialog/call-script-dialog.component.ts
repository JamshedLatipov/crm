import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';

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

export interface CallScriptCategory {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

@Component({
  selector: 'app-call-script-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './call-script-dialog.component.html',
  styleUrls: ['./call-script-dialog.component.scss']
})
export class CallScriptDialogComponent {
  private http = inject(HttpClient);
  private dialogRef = inject(MatDialogRef<CallScriptDialogComponent>);
  private data = inject(MAT_DIALOG_DATA);

  script: Partial<CallScript> = {};
  categories = signal<CallScriptCategory[]>([]);
  isEditMode = false;

  ngOnInit() {
    this.script = { ...this.data.script };
    this.categories.set(this.data.categories || []);
    this.isEditMode = this.data.isEditMode || false;

    // Initialize arrays if not present
    if (!this.script.steps) this.script.steps = [];
    if (!this.script.questions) this.script.questions = [];
    if (!this.script.tips) this.script.tips = [];
  }

  addStep() {
    this.script.steps = [...(this.script.steps || []), ''];
  }

  removeStep(index: number) {
    this.script.steps = (this.script.steps || []).filter((_, i) => i !== index);
  }

  addQuestion() {
    this.script.questions = [...(this.script.questions || []), ''];
  }

  removeQuestion(index: number) {
    this.script.questions = (this.script.questions || []).filter((_, i) => i !== index);
  }

  addTip() {
    this.script.tips = [...(this.script.tips || []), ''];
  }

  removeTip(index: number) {
    this.script.tips = (this.script.tips || []).filter((_, i) => i !== index);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onSave() {
    if (!this.script.title?.trim() || !this.script.categoryId) return;

    const scriptData = {
      ...this.script,
      steps: this.parseMultilineText(this.script.steps as string[]),
      questions: this.parseMultilineText(this.script.questions as string[]),
      tips: this.parseMultilineText(this.script.tips as string[])
    };

    this.dialogRef.close(scriptData);
  }

  onCancel() {
    this.dialogRef.close();
  }

  private parseMultilineText(textArray: string[]): string[] {
    if (!Array.isArray(textArray)) return [];
    return textArray.filter(item => item && item.trim());
  }
}