import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  variables: string[];
  isActive: boolean;
}

@Component({
  selector: 'app-email-template-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <div class="template-list-container">
      <div class="header">
        <h1>Email Шаблоны</h1>
        <button mat-raised-button color="primary" routerLink="/notifications/email-templates/new">
          <mat-icon>add</mat-icon>
          Создать шаблон
        </button>
      </div>

      <table mat-table [dataSource]="templates()" class="templates-table">
        
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Название</th>
          <td mat-cell *matCellDef="let template">{{ template.name }}</td>
        </ng-container>

        <ng-container matColumnDef="subject">
          <th mat-header-cell *matHeaderCellDef>Тема</th>
          <td mat-cell *matCellDef="let template">{{ template.subject }}</td>
        </ng-container>

        <ng-container matColumnDef="variables">
          <th mat-header-cell *matHeaderCellDef>Переменные</th>
          <td mat-cell *matCellDef="let template">
            @for (variable of template.variables; track variable) {
              <mat-chip>{{ variable }}</mat-chip>
            }
          </td>
        </ng-container>

        <ng-container matColumnDef="isActive">
          <th mat-header-cell *matHeaderCellDef>Статус</th>
          <td mat-cell *matCellDef="let template">
            <mat-chip [class.active]="template.isActive" [class.inactive]="!template.isActive">
              {{ template.isActive ? 'Активен' : 'Неактивен' }}
            </mat-chip>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Действия</th>
          <td mat-cell *matCellDef="let template">
            <button mat-icon-button [routerLink]="['/notifications/email-templates', template.id]" matTooltip="Редактировать">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button [routerLink]="['/notifications/email-templates', template.id, 'preview']" matTooltip="Предпросмотр">
              <mat-icon>visibility</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    .template-list-container {
      padding: 24px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .templates-table {
      width: 100%;
    }

    mat-chip {
      margin: 2px;
      
      &.active {
        background-color: #4caf50;
        color: white;
      }
      
      &.inactive {
        background-color: #9e9e9e;
        color: white;
      }
    }
  `]
})
export class EmailTemplateListComponent implements OnInit {
  templates = signal<EmailTemplate[]>([]);
  displayedColumns = ['name', 'subject', 'variables', 'isActive', 'actions'];

  ngOnInit() {
    // TODO: Загрузить через сервис
    this.templates.set([
      {
        id: '1',
        name: 'Приветственное письмо',
        subject: 'Добро пожаловать, {{name}}!',
        variables: ['name', 'email'],
        isActive: true
      }
    ]);
  }
}
