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
import { SegmentService } from '../../../services/segment.service';
import { Segment } from '../../../models/notification.models';

@Component({
  selector: 'app-segment-list',
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
      title="Сегменты контактов"
      [subtitle]="'Всего: ' + (segments()?.length || 0) + ' сегментов'"
    >
      <div page-actions>
        <button mat-raised-button color="primary" routerLink="/notifications/segments/new">
          <mat-icon>add</mat-icon>
          Создать сегмент
        </button>
      </div>

      @if (segments()?.length === 0 && !loading()) {
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
        <crm-table
          [columns]="columns"
          [data]="segments()"
          [pageSize]="20"
          [templates]="tableTemplates"
        ></crm-table>
      }

      <ng-template #descriptionTemplate let-segment>
        <div class="description-text">{{ segment.description }}</div>
      </ng-template>

      <ng-template #contactCountTemplate let-segment>
        <div class="count-badge">
          <mat-icon>people</mat-icon>
          <span>{{ segment.contactsCount || 0 }}</span>
        </div>
      </ng-template>

      <ng-template #filterCountTemplate let-segment>
        <div class="filter-badge">
          <mat-icon>filter_alt</mat-icon>
          <span>{{ segment.filters?.length || 0 }}</span>
        </div>
      </ng-template>

      <ng-template #actionsTemplate let-segment>
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
          <button mat-menu-item (click)="duplicateSegment(segment)">
            <mat-icon>content_copy</mat-icon>
            <span>Дублировать</span>
          </button>
          <button mat-menu-item (click)="refreshSegment(segment)">
            <mat-icon>refresh</mat-icon>
            <span>Обновить</span>
          </button>
          <button mat-menu-item (click)="deleteSegment(segment)">
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
  `]
})
export class SegmentListComponent implements OnInit, AfterViewInit {
  private readonly segmentService = inject(SegmentService);
  private readonly snackBar = inject(MatSnackBar);

  segments = this.segmentService.segments;
  loading = this.segmentService.isLoading;

  @ViewChild('descriptionTemplate') descriptionTemplate!: TemplateRef<any>;
  @ViewChild('contactCountTemplate') contactCountTemplate!: TemplateRef<any>;
  @ViewChild('filterCountTemplate') filterCountTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  columns: CrmColumn[] = [
    { key: 'name', label: 'Название', sortable: true },
    { key: 'description', label: 'Описание', template: 'descriptionTemplate' },
    { key: 'contactsCount', label: 'Контактов', template: 'contactCountTemplate' },
    { key: 'filterCount', label: 'Фильтров', template: 'filterCountTemplate' },
    { key: 'actions', label: 'Действия', template: 'actionsTemplate' },
  ];

  get tableTemplates(): { [key: string]: TemplateRef<any> } {
    return {
      descriptionTemplate: this.descriptionTemplate,
      contactCountTemplate: this.contactCountTemplate,
      filterCountTemplate: this.filterCountTemplate,
      actionsTemplate: this.actionsTemplate,
    };
  }

  ngOnInit() {
    this.loadSegments();
  }

  ngAfterViewInit() {
    // Templates are now available
  }

  loadSegments() {
    this.segmentService.getAll().subscribe({
      error: () => {
        this.snackBar.open('Ошибка загрузки сегментов', 'Закрыть', { duration: 3000 });
      }
    });
  }

  deleteSegment(segment: Segment) {
    if (confirm(`Удалить сегмент "${segment.name}"?`)) {
      this.segmentService.delete(segment.id).subscribe({
        next: () => {
          this.snackBar.open('Сегмент удален', 'Закрыть', { duration: 3000 });
          this.loadSegments();
        },
        error: () => {
          this.snackBar.open('Ошибка удаления сегмента', 'Закрыть', { duration: 3000 });
        }
      });
    }
  }

  duplicateSegment(segment: Segment) {
    this.segmentService.duplicate(segment.id).subscribe({
      next: () => {
        this.snackBar.open('Сегмент скопирован', 'Закрыть', { duration: 3000 });
        this.loadSegments();
      },
      error: () => {
        this.snackBar.open('Ошибка копирования сегмента', 'Закрыть', { duration: 3000 });
      }
    });
  }

  refreshSegment(segment: Segment) {
    this.segmentService.refreshContactCount(segment.id).subscribe({
      next: (result) => {
        this.snackBar.open(`Обновлено: ${result.count} контактов`, 'Закрыть', { duration: 3000 });
        this.loadSegments();
      },
      error: () => {
        this.snackBar.open('Ошибка обновления сегмента', 'Закрыть', { duration: 3000 });
      }
    });
  }
}
