import { Component, OnInit, signal, ViewChild, TemplateRef, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn } from '../../../../shared/components/crm-table/crm-table.component';
import { SmsTemplateService } from '../../../services/sms-template.service';
import { SmsTemplate } from '../../../models/notification.models';

@Component({
  selector: 'app-sms-template-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CrmTableComponent,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatSnackBarModule,
    PageLayoutComponent
  ],
  template: `
    <app-page-layout
      title="SMS Шаблоны"
      [subtitle]="'Всего: ' + templates().length + ' шаблонов'"
    >
      <div page-actions>
        <button mat-raised-button color="primary" routerLink="/notifications/sms-templates/new">
          <mat-icon>add</mat-icon>
          Создать шаблон
        </button>
      </div>

      @if (templates().length === 0) {
        <div class="empty-state">
          <mat-icon>description</mat-icon>
          <h3>Нет шаблонов</h3>
          <p>Создайте первый SMS шаблон для использования в кампаниях</p>
          <button mat-raised-button color="primary" routerLink="/notifications/sms-templates/new">
            <mat-icon>add</mat-icon>
            Создать шаблон
          </button>
        </div>
      } @else {
        <crm-table
          [columns]="columns"
          [data]="templates()"
          [pageSize]="20"
          [templates]="tableTemplates"
        ></crm-table>
      }

      <ng-template #contentTemplate let-template>
        <div class="content-preview">{{ template.content }}</div>
      </ng-template>

      <ng-template #variablesTemplate let-template>
        <div class="variables-list">
          @for (variable of template.variables; track variable) {
            <span class="variable-chip">{{ variable }}</span>
          }
          @if (template.variables.length === 0) {
            <span class="text-muted">—</span>
          }
        </div>
      </ng-template>

      <ng-template #statusTemplate let-template>
        <span class="status-badge" [class.active]="template.isActive">
          {{ template.isActive ? 'Активен' : 'Неактивен' }}
        </span>
      </ng-template>

      <ng-template #actionsTemplate let-template>
        <button mat-icon-button [routerLink]="['/notifications/sms-templates', template.id]" matTooltip="Редактировать">
          <mat-icon>edit</mat-icon>
        </button>
        <button mat-icon-button [routerLink]="['/notifications/sms-templates', template.id, 'preview']" matTooltip="Предпросмотр">
          <mat-icon>visibility</mat-icon>
        </button>
        <button mat-icon-button [matMenuTriggerFor]="actionMenu" matTooltip="Еще">
          <mat-icon>more_vert</mat-icon>
        </button>
        
        <mat-menu #actionMenu="matMenu">
          <button mat-menu-item (click)="deleteTemplate(template)">
            <mat-icon>delete</mat-icon>
            <span>Удалить</span>
          </button>
        </mat-menu>
      </ng-template>
    </app-page-layout>
  `,
  styles: [`
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      
      mat-icon {
        font-size: 80px;
        width: 80px;
        height: 80px;
        color: #9ca3af;
        margin-bottom: 16px;
      }
      
      h3 {
        font-size: 24px;
        font-weight: 600;
        color: #374151;
        margin: 0 0 8px 0;
      }
      
      p {
        font-size: 16px;
        color: #6b7280;
        margin: 0 0 24px 0;
      }
    }

    .content-preview {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #6b7280;
      font-size: 14px;
    }

    .variables-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .variable-chip {
      display: inline-block;
      padding: 4px 10px;
      background: #ede9fe;
      color: #7c3aed;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
    }

    .text-muted {
      color: #9ca3af;
      font-size: 14px;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      background: #f3f4f6;
      color: #4b5563;
      
      &.active {
        background: #d1fae5;
        color: #065f46;
      }
    }
  `]
})
export class SmsTemplateListComponent implements OnInit, AfterViewInit {
  private readonly smsTemplateService = inject(SmsTemplateService);
  private readonly snackBar = inject(MatSnackBar);

  loading = this.smsTemplateService.isLoading;
  templates = this.smsTemplateService.templates;

  @ViewChild('contentTemplate') contentTemplate!: TemplateRef<any>;
  @ViewChild('variablesTemplate') variablesTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  columns: CrmColumn[] = [
    { key: 'name', label: 'Название', sortable: true },
    { key: 'content', label: 'Содержимое', template: 'contentTemplate' },
    { key: 'variables', label: 'Переменные', template: 'variablesTemplate' },
    { key: 'isActive', label: 'Статус', template: 'statusTemplate' },
    { key: 'actions', label: 'Действия', template: 'actionsTemplate' },
  ];

  get tableTemplates(): { [key: string]: TemplateRef<any> } {
    return {
      contentTemplate: this.contentTemplate,
      variablesTemplate: this.variablesTemplate,
      statusTemplate: this.statusTemplate,
      actionsTemplate: this.actionsTemplate,
    };
  }

  ngOnInit() {
    this.loadTemplates();
  }

  ngAfterViewInit() {
    // Templates are now available
  }

  loadTemplates() {
    this.smsTemplateService.getAll().subscribe({
      error: () => {
        this.snackBar.open('Ошибка загрузки шаблонов', 'Закрыть', { duration: 3000 });
      }
    });
  }

  deleteTemplate(template: SmsTemplate) {
    if (confirm(`Удалить шаблон "${template.name}"?`)) {
      this.smsTemplateService.delete(template.id).subscribe({
        next: () => {
          this.snackBar.open('Шаблон удален', 'Закрыть', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Ошибка удаления шаблона', 'Закрыть', { duration: 3000 });
        }
      });
    }
  }
}
