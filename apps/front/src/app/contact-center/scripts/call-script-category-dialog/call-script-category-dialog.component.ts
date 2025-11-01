import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface CallScriptCategory {
  id: string;
  name: string;
  description: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Component({
  selector: 'app-call-script-category-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule
  ],
  templateUrl: './call-script-category-dialog.component.html',
  styleUrls: ['./call-script-category-dialog.component.scss']
})
export class CallScriptCategoryDialogComponent implements OnInit {
  private http = inject(HttpClient);
  private dialogRef = inject(MatDialogRef<CallScriptCategoryDialogComponent>);
  private data = inject(MAT_DIALOG_DATA);
  private apiBase = environment.apiBase;

  categoryId = signal<string | null>(null);
  isEditMode = signal(false);
  loading = signal(false);
  saving = signal(false);

  categoryData: CallScriptCategory = {
    id: '',
    name: '',
    description: '',
    color: '#2196F3',
    sortOrder: 0,
    isActive: true
  };

  ngOnInit() {
    if (this.data?.category) {
      this.categoryData = { ...this.data.category };
      this.isEditMode.set(true);
    }
  }

  onSave() {
    if (!this.categoryData.name?.trim()) return;

    this.saving.set(true);
    if (this.isEditMode()) {
      this.updateCategory();
    } else {
      this.createCategory();
    }
  }

  createCategory() {
    const createData = {
      name: this.categoryData.name,
      description: this.categoryData.description,
      color: this.categoryData.color,
      sortOrder: this.categoryData.sortOrder,
      isActive: this.categoryData.isActive
    };

    this.http.post<CallScriptCategory>(`${this.apiBase}/call-script-categories`, createData).subscribe({
      next: (savedCategory) => {
        this.saving.set(false);
        this.dialogRef.close(savedCategory);
      },
      error: (error) => {
        console.error('Error creating category:', error);
        this.saving.set(false);
      }
    });
  }

  updateCategory() {
    const updateData = {
      name: this.categoryData.name,
      description: this.categoryData.description,
      color: this.categoryData.color,
      sortOrder: this.categoryData.sortOrder,
      isActive: this.categoryData.isActive
    };

    this.http.patch<CallScriptCategory>(`${this.apiBase}/call-script-categories/${this.categoryData.id}`, updateData).subscribe({
      next: (updatedCategory) => {
        this.saving.set(false);
        this.dialogRef.close(updatedCategory);
      },
      error: (error) => {
        console.error('Error updating category:', error);
        this.saving.set(false);
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}