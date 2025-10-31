import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CallScriptCategory } from './call-script-category-dialog.component';
import { CallScriptCategoriesListDialogComponent } from './call-script-categories-list-dialog.component';
import { CallScriptDialogComponent } from './call-script-dialog/call-script-dialog.component';

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
  selector: 'app-call-scripts-manager',
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
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './call-scripts-manager.component.html',
  styleUrls: ['./call-scripts-manager.component.scss']
})
export class CallScriptsManagerComponent {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private apiBase = environment.apiBase;

  scripts = signal<CallScript[]>([]);
  loading = signal(false);
  selectedScript = signal<CallScript | null>(null);
  searchQuery = signal('');
  categories = signal<CallScriptCategory[]>([]);

  // Filter properties
  selectedCategoryId = '';
  selectedStatus = '';

  // Computed signals for statistics
  activeScriptsCount = computed(() => this.scripts().filter(s => s.isActive).length);
  totalScriptsCount = computed(() => this.scripts().length);

  ngOnInit() {
    this.loadCategories();
    this.loadScripts();
  }

  loadCategories() {
    this.http.get<CallScriptCategory[]>(`${this.apiBase}/call-script-categories/active`).subscribe({
      next: (categories) => {
        this.categories.set(categories);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadScripts() {
    this.loading.set(true);
    this.http.get<CallScript[]>(`${this.apiBase}/call-scripts`).subscribe({
      next: (scripts) => {
        this.scripts.set(scripts);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading scripts:', error);
        this.loading.set(false);
      }
    });
  }

  get filteredScripts(): CallScript[] {
    let filtered = this.scripts();

    // Text search
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(script =>
        script.title.toLowerCase().includes(query) ||
        script.description.toLowerCase().includes(query) ||
        (script.category?.name || '').toLowerCase().includes(query)
      );
    }

    // Category filter
    if (this.selectedCategoryId) {
      filtered = filtered.filter(script => script.categoryId === this.selectedCategoryId);
    }

    // Status filter
    if (this.selectedStatus) {
      const isActive = this.selectedStatus === 'active';
      filtered = filtered.filter(script => script.isActive === isActive);
    }

    return filtered;
  }

  filterByCategory() {
    // Trigger change detection
    this.searchQuery.set(this.searchQuery());
  }

  filterByStatus() {
    // Trigger change detection
    this.searchQuery.set(this.searchQuery());
  }

  selectScript(script: CallScript) {
    this.selectedScript.set(script);
  }

  createNewScript() {
    const defaultCategoryId = this.categories().length > 0 ? this.categories()[0].id : '';
    const dialogRef = this.dialog.open(CallScriptDialogComponent, {
      width: '90vw',
      maxWidth: '900px',
      height: '90vh',
      maxHeight: '800px',
      data: {
        script: {
          title: '',
          description: '',
          categoryId: defaultCategoryId,
          steps: [],
          questions: [],
          tips: [],
          isActive: true
        },
        categories: this.categories(),
        isEditMode: false
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.saveScript(result);
      }
    });
  }

  editScript(script: CallScript) {
    const dialogRef = this.dialog.open(CallScriptDialogComponent, {
      width: '90vw',
      maxWidth: '900px',
      height: '90vh',
      maxHeight: '800px',
      data: {
        script: { ...script },
        categories: this.categories(),
        isEditMode: true
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateScript(result);
      }
    });
  }

  saveScript(scriptData: Partial<CallScript>) {
    this.http.post<CallScript>(`${this.apiBase}/call-scripts`, scriptData).subscribe({
      next: (savedScript) => {
        this.scripts.update(scripts => [...scripts, savedScript]);
      },
      error: (error) => {
        console.error('Error saving script:', error);
      }
    });
  }

  updateScript(script: CallScript) {
    this.http.put<CallScript>(`${this.apiBase}/call-scripts/${script.id}`, script).subscribe({
      next: (updatedScript) => {
        this.scripts.update(scripts =>
          scripts.map(s => s.id === script.id ? updatedScript : s)
        );
        this.selectedScript.set(updatedScript);
      },
      error: (error) => {
        console.error('Error updating script:', error);
      }
    });
  }

  deleteScript(script: CallScript) {
    if (!confirm(`Удалить скрипт "${script.title}"?`)) return;

    this.http.delete(`${this.apiBase}/call-scripts/${script.id}`).subscribe({
      next: () => {
        this.scripts.update(scripts => scripts.filter(s => s.id !== script.id));
        if (this.selectedScript()?.id === script.id) {
          this.selectedScript.set(null);
        }
      },
      error: (error) => {
        console.error('Error deleting script:', error);
      }
    });
  }

  cancelEdit() {
    this.selectedScript.set(null);
  }

  getCategoryLabel(categoryId: string): string {
    const category = this.categories().find(c => c.id === categoryId);
    return category?.name || categoryId;
  }

  trackByScriptId(index: number, script: CallScript): string {
    return script.id;
  }

  // Category management methods
  openCategoriesDialog() {
    const dialogRef = this.dialog.open(CallScriptCategoriesListDialogComponent, {
      width: '90vw',
      maxWidth: '1200px',
      height: '80vh',
      maxHeight: '700px'
    });

    // После закрытия модалки перезагрузим категории
    dialogRef.afterClosed().subscribe(() => {
      this.loadCategories();
    });
  }
}