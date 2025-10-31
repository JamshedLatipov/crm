import { Component, inject, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface CallScriptCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-call-script-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule
  ],
  template: `
    <div class="category-dialog">
      <h2 mat-dialog-title>{{ isEditMode ? 'Редактировать категорию' : 'Создать категорию' }}</h2>

      <mat-dialog-content>
        <form class="category-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Название категории *</mat-label>
            <input matInput [(ngModel)]="categoryForm.name" name="name" required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Описание</mat-label>
            <textarea matInput [(ngModel)]="categoryForm.description" name="description" rows="3"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Цвет</mat-label>
            <input matInput type="color" [(ngModel)]="categoryForm.color" name="color">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Порядок сортировки</mat-label>
            <input matInput type="number" [(ngModel)]="categoryForm.sortOrder" name="sortOrder">
          </mat-form-field>

          <mat-checkbox [(ngModel)]="categoryForm.isActive" name="isActive">
            Активная категория
          </mat-checkbox>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Отмена</button>
        <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!categoryForm.name?.trim()">
          {{ isEditMode ? 'Сохранить' : 'Создать' }}
        </button>
        <button *ngIf="isEditMode" mat-raised-button color="warn" (click)="onDelete()" style="margin-left: 8px;">
          <mat-icon>delete</mat-icon>
          Удалить
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .category-dialog {
      min-width: 400px;
    }

    .category-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    mat-form-field {
      width: 100%;
    }

    mat-checkbox {
      margin-top: 8px;
    }
  `]
})
export class CallScriptCategoryDialogComponent {
  private http = inject(HttpClient);
  private dialogRef = inject(MatDialogRef<CallScriptCategoryDialogComponent>);
  private apiBase = environment.apiBase;

  @Input() category: CallScriptCategory | null = null;
  @Output() categorySaved = new EventEmitter<CallScriptCategory>();
  @Output() categoryDeleted = new EventEmitter<string>();

  isEditMode = false;
  categoryForm: Partial<CallScriptCategory> = {
    name: '',
    description: '',
    color: '#2196F3',
    isActive: true,
    sortOrder: 0
  };

  ngOnInit() {
    if (this.category) {
      this.isEditMode = true;
      this.categoryForm = { ...this.category };
    }
  }

  onSave() {
    if (!this.categoryForm.name?.trim()) return;

    const formData = this.categoryForm;

    if (this.isEditMode) {
      // Update existing category
      this.http.patch<CallScriptCategory>(
        `${this.apiBase}/call-script-categories/${this.category!.id}`,
        formData
      ).subscribe({
        next: (updatedCategory) => {
          this.categorySaved.emit(updatedCategory);
          this.dialogRef.close();
        },
        error: (error) => {
          console.error('Error updating category:', error);
          // TODO: Show error message to user
        }
      });
    } else {
      // Create new category
      this.http.post<CallScriptCategory>(
        `${this.apiBase}/call-script-categories`,
        formData
      ).subscribe({
        next: (newCategory) => {
          this.categorySaved.emit(newCategory);
          this.dialogRef.close();
        },
        error: (error) => {
          console.error('Error creating category:', error);
          // TODO: Show error message to user
        }
      });
    }
  }

  onDelete() {
    if (!this.category || !confirm(`Удалить категорию "${this.category.name}"?`)) return;

    this.http.delete(`${this.apiBase}/call-script-categories/${this.category.id}`).subscribe({
      next: () => {
        this.categoryDeleted.emit(this.category!.id);
        this.dialogRef.close();
      },
      error: (error) => {
        console.error('Error deleting category:', error);
        // TODO: Show error message to user
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}