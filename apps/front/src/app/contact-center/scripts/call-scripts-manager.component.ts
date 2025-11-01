import { Component, inject, signal, computed, Input, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
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
import { DatePipe } from '@angular/common';
import { CrmTableComponent, CrmColumn } from '../../../../src/app/shared/components/crm-table/crm-table.component';
import { CallScriptCategory } from './call-script-category-dialog/call-script-category-dialog.component';
import { CallScriptDialogComponent } from './call-script-dialog/call-script-dialog.component';
import { RouterLink, RouterModule, Router } from "@angular/router";

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
    MatProgressSpinnerModule,
    DatePipe,
    CrmTableComponent,
    RouterModule,
    RouterLink
],
  templateUrl: './call-scripts-manager.component.html',
  styleUrls: ['./call-scripts-manager.component.scss']
})
export class CallScriptsManagerComponent implements AfterViewInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private apiBase = environment.apiBase;

  @ViewChild('titleTemplate') titleTemplate!: TemplateRef<any>;
  @ViewChild('categoryTemplate') categoryTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('updatedAtTemplate') updatedAtTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  @Input() templates: { [key: string]: TemplateRef<any> } = {};

  scripts = signal<CallScript[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  categories = signal<CallScriptCategory[]>([]);

  // Filter properties
  selectedCategoryId = '';
  selectedStatus = '';

  // Computed signals for statistics
  activeScriptsCount = computed(() => this.scripts().filter(s => s.isActive).length);
  totalScriptsCount = computed(() => this.scripts().length);

  // Table columns configuration
  columns: CrmColumn[] = [
    {
      key: 'title',
      label: 'Название',
      template: 'titleTemplate'
    },
    {
      key: 'category',
      label: 'Категория',
      template: 'categoryTemplate'
    },
    {
      key: 'status',
      label: 'Статус',
      template: 'statusTemplate'
    },
    {
      key: 'updatedAt',
      label: 'Обновлено',
      template: 'updatedAtTemplate'
    },
    {
      key: 'actions',
      label: 'Действия',
      template: 'actionsTemplate'
    }
  ];

  // Prepare data for table with subtitle
  get tableData(): any[] {
    return this.filteredScripts.map(script => ({
      ...script,
      subtitle: script.description || 'Без описания'
    }));
  }

  get tableTemplates(): { [key: string]: TemplateRef<any> } {
    return {
      titleTemplate: this.titleTemplate,
      categoryTemplate: this.categoryTemplate,
      statusTemplate: this.statusTemplate,
      updatedAtTemplate: this.updatedAtTemplate,
      actionsTemplate: this.actionsTemplate
    };
  }

  ngOnInit() {
    this.loadCategories();
    this.loadScripts();
  }

  ngAfterViewInit() {
    // Templates are now available after view init
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
    // Create create object with only the fields that exist in the entity
    const createData: Partial<CallScript> = {
      title: scriptData.title,
      description: scriptData.description,
      categoryId: scriptData.categoryId,
      steps: scriptData.steps,
      questions: scriptData.questions,
      tips: scriptData.tips,
      isActive: scriptData.isActive
    };

    this.http.post<CallScript>(`${this.apiBase}/call-scripts`, createData).subscribe({
      next: (savedScript) => {
        this.scripts.update(scripts => [...scripts, savedScript]);
      },
      error: (error) => {
        console.error('Error saving script:', error);
      }
    });
  }

  updateScript(script: CallScript) {
    // Create update object with only the fields that exist in the entity
    const updateData: Partial<CallScript> = {
      title: script.title,
      description: script.description,
      categoryId: script.categoryId,
      steps: script.steps,
      questions: script.questions,
      tips: script.tips,
      isActive: script.isActive
    };

    this.http.patch<CallScript>(`${this.apiBase}/call-scripts/${script.id}`, updateData).subscribe({
      next: (updatedScript) => {
        this.scripts.update(scripts =>
          scripts.map(s => s.id === script.id ? updatedScript : s)
        );
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
      },
      error: (error) => {
        console.error('Error deleting script:', error);
      }
    });
  }

  viewScript(script: CallScript) {
    this.router.navigate(['/contact-center/scripts/view', script.id]);
  }
}