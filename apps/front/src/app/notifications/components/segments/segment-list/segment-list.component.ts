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

interface Segment {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  filterCount: number;
}

@Component({
  selector: 'app-segment-list',
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
      title="Сегменты контактов"
      [subtitle]="'Всего: ' + segments().length + ' сегментов'"
    >
      <div page-actions>
        <button mat-raised-button color="primary" routerLink="/notifications/segments/new">
          <mat-icon>add</mat-icon>
          Создать сегмент
        </button>
      </div>

      @if (segments().length === 0) {
        <div class="empty-state">
          <mat-icon>group_work</mat-icon>
          <h3>Нет сегментов</h3>
          <p>Создайте первый сегмент для группировки контактов</p>
          <button mat-raised-button color="primary" routerLink="/notifications/segments/new">
            <mat-icon>add</mat-icon>
            Создать сегмент
          </button>
        </div>
      } @else {
        <div class="modern-table-container">
          <div class="table-wrapper">
            <table mat-table [dataSource]="segments()" class="modern-table">
        
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Название</th>
                <td mat-cell *matCellDef="let segment">
                  <strong>{{ segment.name }}</strong>
                </td>
              </ng-container>

              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Описание</th>
                <td mat-cell *matCellDef="let segment">
                  <div class="description-text">{{ segment.description }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="contactCount">
                <th mat-header-cell *matHeaderCellDef>Контактов</th>
                <td mat-cell *matCellDef="let segment">
                  <div class="count-badge">
                    <mat-icon>people</mat-icon>
                    <span>{{ segment.contactCount }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="filterCount">
                <th mat-header-cell *matHeaderCellDef>Фильтров</th>
                <td mat-cell *matCellDef="let segment">
                  <div class="filter-badge">
                    <mat-icon>filter_alt</mat-icon>
                    <span>{{ segment.filterCount }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="actions-column">Действия</th>
                <td mat-cell *matCellDef="let segment" class="actions-column">
                  <button mat-icon-button [routerLink]="['/notifications/segments', segment.id]" matTooltip="Редактировать">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Просмотр контактов">
                    <mat-icon>people</mat-icon>
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
                      <mat-icon>refresh</mat-icon>
                      <span>Обновить</span>
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

    .description-text {
      color: #6b7280;
      font-size: 14px;
      max-width: 400px;
    }

    .count-badge,
    .filter-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      
      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .count-badge {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #1e40af;
      
      mat-icon {
        color: #2563eb;
      }
    }

    .filter-badge {
      background: #f3f4f6;
      color: #4b5563;
      
      mat-icon {
        color: #6b7280;
      }
    }

    .actions-column {
      text-align: right;
      width: 150px;
    }
  `]
})
export class SegmentListComponent implements OnInit {
  segments = signal<Segment[]>([]);
  displayedColumns = ['name', 'description', 'contactCount', 'filterCount', 'actions'];

  ngOnInit() {
    // TODO: Загрузить через сервис
    this.segments.set([
      {
        id: '1',
        name: 'Активные клиенты',
        description: 'Клиенты с активными сделками',
        contactCount: 250,
        filterCount: 2
      }
    ]);
  }
}
