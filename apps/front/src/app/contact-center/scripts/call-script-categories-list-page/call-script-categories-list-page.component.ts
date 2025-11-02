import { Component, inject, signal, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { CallScriptCategory, CallScriptCategoryDialogComponent } from '../call-script-category-dialog/call-script-category-dialog.component';
import { CrmTableComponent, CrmColumn } from '../../../shared/components/crm-table/crm-table.component';
import { PageLayoutComponent } from '../../../shared/page-layout/page-layout.component';

@Component({
  selector: 'app-call-script-categories-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatChipsModule,
    MatToolbarModule,
    MatCardModule,
    MatDialogModule,
    CrmTableComponent,
    PageLayoutComponent
  ],
  templateUrl: './call-script-categories-list-page.component.html',
  styleUrls: ['./call-script-categories-list-page.component.scss']
})
export class CallScriptCategoriesListPageComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private apiBase = environment.apiBase;

  @ViewChild('nameTemplate') nameTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  categories = signal<CallScriptCategory[]>([]);
  filteredCategories = signal<CallScriptCategory[]>([]);
  searchQuery = '';
  displayedColumns: string[] = ['name', 'description', 'sortOrder', 'isActive', 'actions'];

  columns: CrmColumn[] = [
    {
      key: 'name',
      label: 'Название',
      template: 'nameTemplate'
    },
    {
      key: 'description',
      label: 'Описание',
      cell: (category: CallScriptCategory) => category.description || '—'
    },
    {
      key: 'sortOrder',
      label: 'Порядок',
      cell: (category: CallScriptCategory) => category.sortOrder.toString()
    },
    {
      key: 'isActive',
      label: 'Статус',
      template: 'statusTemplate'
    },
    {
      key: 'actions',
      label: 'Действия',
      template: 'actionsTemplate'
    }
  ];

  // Prepare data for table
  get tableData(): any[] {
    return this.filteredCategories();
  }

  get tableTemplates(): { [key: string]: TemplateRef<any> } {
    return {
      nameTemplate: this.nameTemplate,
      statusTemplate: this.statusTemplate,
      actionsTemplate: this.actionsTemplate
    };
  }

  ngOnInit() {
    this.loadCategories();
  }

  goBack() {
    this.router.navigate(['/contact-center/scripts']);
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
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadCategories();
      }
    });
  }

  openEditCategoryDialog(category: CallScriptCategory) {
    const dialogRef = this.dialog.open(CallScriptCategoryDialogComponent, {
      width: '600px',
      data: { category }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadCategories();
      }
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

  onTableActionClick(event: Event) {
    const target = event.target as HTMLElement;
    const button = target.closest('button.edit-btn, button.delete-btn') as HTMLButtonElement;
    if (!button) return;

    event.stopPropagation();
    const categoryId = button.getAttribute('data-category-id');
    if (!categoryId) return;

    const category = this.categories().find(c => c.id === categoryId);
    if (!category) return;

    if (button.classList.contains('edit-btn')) {
      this.openEditCategoryDialog(category);
    } else if (button.classList.contains('delete-btn')) {
      this.deleteCategory(category);
    }
  }
}