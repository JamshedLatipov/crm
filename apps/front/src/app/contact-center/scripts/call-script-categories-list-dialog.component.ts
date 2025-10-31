import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CallScriptCategoryDialogComponent, CallScriptCategory } from './call-script-category-dialog.component';

@Component({
  selector: 'app-call-script-categories-list-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatChipsModule
  ],
  template: `
    <div class="categories-list-dialog">
      <h2 mat-dialog-title>Управление категориями скриптов</h2>

      <mat-dialog-content>
        <div class="dialog-header">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Поиск категорий</mat-label>
            <input matInput [(ngModel)]="searchQuery" (input)="filterCategories()" placeholder="Введите название категории">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <button mat-raised-button color="primary" (click)="openCreateCategoryDialog()">
            <mat-icon>add</mat-icon>
            Создать категорию
          </button>
        </div>

        <div class="categories-table-container">
          <table mat-table [dataSource]="filteredCategories()" matSort class="categories-table">
            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Название</th>
              <td mat-cell *matCellDef="let category">
                <div class="category-name">
                  <div
                    class="color-indicator"
                    [style.background-color]="category.color || '#2196F3'"
                  ></div>
                  {{ category.name }}
                </div>
              </td>
            </ng-container>

            <!-- Description Column -->
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Описание</th>
              <td mat-cell *matCellDef="let category">
                <span class="description-text">{{ category.description || '—' }}</span>
              </td>
            </ng-container>

            <!-- Sort Order Column -->
            <ng-container matColumnDef="sortOrder">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Порядок</th>
              <td mat-cell *matCellDef="let category">{{ category.sortOrder }}</td>
            </ng-container>

            <!-- Active Column -->
            <ng-container matColumnDef="isActive">
              <th mat-header-cell *matHeaderCellDef>Статус</th>
              <td mat-cell *matCellDef="let category">
                <mat-chip
                  [color]="category.isActive ? 'primary' : 'warn'"
                  selected
                >
                  {{ category.isActive ? 'Активна' : 'Неактивна' }}
                </mat-chip>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Действия</th>
              <td mat-cell *matCellDef="let category">
                <button mat-icon-button (click)="openEditCategoryDialog(category)" title="Редактировать">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteCategory(category)" title="Удалить">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="filteredCategories().length === 0" class="empty-state">
            <mat-icon>category</mat-icon>
            <p>{{ searchQuery ? 'Категории не найдены' : 'Категорий пока нет' }}</p>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Закрыть</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .categories-list-dialog {
      min-width: 800px;
      max-width: 1200px;
      min-height: 600px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      gap: 16px;
    }

    .search-field {
      flex: 1;
      max-width: 400px;
    }

    .categories-table-container {
      max-height: 400px;
      overflow-y: auto;
    }

    .categories-table {
      width: 100%;
    }

    .category-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .color-indicator {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid #ddd;
    }

    .description-text {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    ::ng-deep .mat-mdc-chip {
      min-height: 24px !important;
    }
  `]
})
export class CallScriptCategoriesListDialogComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<CallScriptCategoriesListDialogComponent>);
  private apiBase = environment.apiBase;

  categories = signal<CallScriptCategory[]>([]);
  filteredCategories = signal<CallScriptCategory[]>([]);
  searchQuery = '';
  displayedColumns: string[] = ['name', 'description', 'sortOrder', 'isActive', 'actions'];

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.http.get<CallScriptCategory[]>(`${this.apiBase}/call-script-categories`).subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.filteredCategories.set(categories);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  filterCategories() {
    const query = this.searchQuery.toLowerCase();
    const filtered = this.categories().filter(category =>
      category.name.toLowerCase().includes(query) ||
      (category.description && category.description.toLowerCase().includes(query))
    );
    this.filteredCategories.set(filtered);
  }

  openCreateCategoryDialog() {
    const dialogRef = this.dialog.open(CallScriptCategoryDialogComponent, {
      width: '500px'
    });

    dialogRef.componentInstance.categorySaved.subscribe((newCategory: CallScriptCategory) => {
      this.loadCategories(); // Reload to get updated list
    });
  }

  openEditCategoryDialog(category: CallScriptCategory) {
    const dialogRef = this.dialog.open(CallScriptCategoryDialogComponent, {
      width: '500px'
    });

    dialogRef.componentInstance.category = category;
    dialogRef.componentInstance.categorySaved.subscribe((updatedCategory: CallScriptCategory) => {
      this.loadCategories(); // Reload to get updated list
    });

    dialogRef.componentInstance.categoryDeleted.subscribe((deletedCategoryId: string) => {
      this.loadCategories(); // Reload to get updated list
    });
  }

  deleteCategory(category: CallScriptCategory) {
    if (!confirm(`Удалить категорию "${category.name}"?\n\nВсе скрипты этой категории останутся без категории.`)) {
      return;
    }

    this.http.delete(`${this.apiBase}/call-script-categories/${category.id}`).subscribe({
      next: () => {
        this.loadCategories();
      },
      error: (error) => {
        console.error('Error deleting category:', error);
        // TODO: Show error message to user
      }
    });
  }

  close() {
    this.dialogRef.close();
  }
}