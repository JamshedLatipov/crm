import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatTooltipModule
  ],
  template: `
    <div class="segment-list-container">
      <div class="header">
        <h1>Сегменты контактов</h1>
        <button mat-raised-button color="primary" routerLink="/notifications/segments/new">
          <mat-icon>add</mat-icon>
          Создать сегмент
        </button>
      </div>

      <table mat-table [dataSource]="segments()" class="segments-table">
        
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Название</th>
          <td mat-cell *matCellDef="let segment">{{ segment.name }}</td>
        </ng-container>

        <ng-container matColumnDef="description">
          <th mat-header-cell *matHeaderCellDef>Описание</th>
          <td mat-cell *matCellDef="let segment">{{ segment.description }}</td>
        </ng-container>

        <ng-container matColumnDef="contactCount">
          <th mat-header-cell *matHeaderCellDef>Контактов</th>
          <td mat-cell *matCellDef="let segment">
            <mat-chip>{{ segment.contactCount }}</mat-chip>
          </td>
        </ng-container>

        <ng-container matColumnDef="filterCount">
          <th mat-header-cell *matHeaderCellDef>Фильтров</th>
          <td mat-cell *matCellDef="let segment">{{ segment.filterCount }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Действия</th>
          <td mat-cell *matCellDef="let segment">
            <button mat-icon-button [routerLink]="['/notifications/segments', segment.id]" matTooltip="Редактировать">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Просмотр контактов">
              <mat-icon>people</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </div>
  `,
  styles: [`
    .segment-list-container {
      padding: 24px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .segments-table {
      width: 100%;
    }

    mat-chip {
      background-color: #2196f3;
      color: white;
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
