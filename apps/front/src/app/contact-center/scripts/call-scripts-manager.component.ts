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
import { CallScript, CallScriptTree } from '../../shared/interfaces/call-script.interface';
import { CallScriptTreeComponent } from './call-script-tree/call-script-tree.component';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';

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
    CallScriptTreeComponent,
    PageLayoutComponent
],
  templateUrl: './call-scripts-manager.component.html',
  styleUrls: ['./call-scripts-manager.component.scss']
})
export class CallScriptsManagerComponent {
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

  scripts = signal<CallScriptTree[]>([]);
  loading = signal(false);
  searchQuery = signal('');
  categories = signal<CallScriptCategory[]>([]);
  viewMode = signal<'list' | 'tree'>('tree');

  // Filter properties
  selectedCategoryId = '';
  selectedStatus = '';

  // Computed signals for statistics
  activeScriptsCount = computed(() => this.flattenScripts(this.scripts()).filter(s => s.isActive).length);
  totalScriptsCount = computed(() => this.flattenScripts(this.scripts()).length);

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
      subtitle: script.description || 'Без описания',
      level: this.getScriptLevel(script)
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
    const url = this.viewMode() === 'tree'
      ? `${this.apiBase}/call-scripts?tree=true&active=true`
      : `${this.apiBase}/call-scripts`;

    this.http.get<CallScriptTree[]>(url).subscribe({
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

  private flattenScripts(scripts: CallScriptTree[]): CallScript[] {
    const result: CallScript[] = [];
    const flatten = (scripts: CallScriptTree[], level = 0) => {
      for (const script of scripts) {
        result.push({ ...script, level: level } as CallScript & { level: number });
        if (script.children && script.children.length > 0) {
          flatten(script.children as CallScriptTree[], level + 1);
        }
      }
    };
    flatten(scripts);
    return result;
  }

  private getScriptLevel(script: CallScript): number {
    let level = 0;
    let current = script;
    while (current.parent) {
      level++;
      current = current.parent;
    }
    return level;
  }

  get filteredScripts(): CallScript[] {
    const allScripts = this.flattenScripts(this.scripts());
    let filtered = allScripts;

    // Text search
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(script =>
        script.title.toLowerCase().includes(query) ||
        script.description?.toLowerCase().includes(query) ||
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

  toggleViewMode() {
    this.viewMode.update(mode => mode === 'list' ? 'tree' : 'list');
    this.loadScripts();
  }

  createNewScript(parentScript?: CallScript) {
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
          parentId: parentScript?.id,
          steps: [],
          questions: [],
          tips: [],
          isActive: true,
          sortOrder: 0
        },
        categories: this.categories(),
        isEditMode: false,
        parentScript
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
      parentId: scriptData.parentId,
      steps: scriptData.steps,
      questions: scriptData.questions,
      tips: scriptData.tips,
      isActive: scriptData.isActive,
      sortOrder: scriptData.sortOrder
    };

    this.http.post<CallScript>(`${this.apiBase}/call-scripts`, createData).subscribe({
      next: (savedScript) => {
        this.loadScripts(); // Reload to get updated tree structure
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
      parentId: script.parentId,
      steps: script.steps,
      questions: script.questions,
      tips: script.tips,
      isActive: script.isActive,
      sortOrder: script.sortOrder
    };

    this.http.patch<CallScript>(`${this.apiBase}/call-scripts/${script.id}`, updateData).subscribe({
      next: (updatedScript) => {
        this.loadScripts(); // Reload to get updated tree structure
      },
      error: (error) => {
        console.error('Error updating script:', error);
      }
    });
  }

  deleteScript(script: CallScript) {
    if (!confirm(`Удалить скрипт "${script.title}"?\n\nВсе дочерние скрипты также будут удалены.`)) return;

    this.http.delete(`${this.apiBase}/call-scripts/${script.id}`).subscribe({
      next: () => {
        this.loadScripts(); // Reload to get updated tree structure
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