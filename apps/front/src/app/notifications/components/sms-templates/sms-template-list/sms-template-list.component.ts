import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';

interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  isActive: boolean;
}

@Component({
  selector: 'app-sms-template-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
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
        <div class="modern-table-container">
          <div class="table-wrapper">
            <table mat-table [dataSource]="templates()" class="modern-table">
              
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Название</th>
                <td mat-cell *matCellDef="let template">
                  <strong>{{ template.name }}</strong>
                </td>
              </ng-container>

              <ng-container matColumnDef="content">
                <th mat-header-cell *matHeaderCellDef>Содержимое</th>
                <td mat-cell *matCellDef="let template">
                  <div class="content-preview">{{ template.content }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="variables">
                <th mat-header-cell *matHeaderCellDef>Переменные</th>
                <td mat-cell *matCellDef="let template">
                  <div class="variables-list">
                    @for (variable of template.variables; track variable) {
                      <span class="variable-chip">{{ variable }}</span>
                    }
                    @if (template.variables.length === 0) {
                      <span class="text-muted">—</span>
                    }
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="isActive">
                <th mat-header-cell *matHeaderCellDef>Статус</th>
                <td mat-cell *matCellDef="let template">
                  <span class="status-badge" [class.active]="template.isActive">
                    {{ template.isActive ? 'Активен' : 'Неактивен' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="actions-column">Действия</th>
                <td mat-cell *matCellDef="let template" class="actions-column">
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
                    <button mat-menu-item>
                      <mat-icon>content_copy</mat-icon>
                      <span>Дублировать</span>
                    </button>
                    <button mat-menu-item>
                      <mat-icon>delete</mat-icon>
                      <span>Удалить</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row"></tr>
            </table>
          </div>
        </div>
      }
    </app-page-layout>
  `,
  styles: [`
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      
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

    .modern-table-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .modern-table {
      width: 100%;
      
      th {
        background: #f9fafb;
        color: #374151;
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        border-bottom: 2px solid #e5e7eb;
      }
      
      td {
        padding: 16px 20px;
        border-bottom: 1px solid #f3f4f6;
      }
      
      .table-row {
        transition: background-color 0.2s;
        
        &:hover {
          background-color: #f9fafb;
        }
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

    .actions-column {
      text-align: right;
      width: 150px;
    }
  `]
})
export class SmsTemplateListComponent implements OnInit {
  templates = signal<SmsTemplate[]>([]);
  displayedColumns = ['name', 'content', 'variables', 'isActive', 'actions'];

  ngOnInit() {
    // TODO: Загрузить через сервис
    this.templates.set([
      {
        id: '1',
        name: 'Приветствие',
        content: 'Здравствуйте, {{name}}! Добро пожаловать в нашу систему.',
        variables: ['name'],
        isActive: true
      }
    ]);
  }
}
