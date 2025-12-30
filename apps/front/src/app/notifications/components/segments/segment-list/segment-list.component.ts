import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../../shared/components/crm-table/crm-table.component';
import { SegmentService } from '../../../services/segment.service';
import { Segment } from '../../../models/notification.models';

@Component({
  selector: 'app-segment-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatSnackBarModule,
    PageLayoutComponent
  ],
  templateUrl: './segment-list.component.html',
  styleUrl: './segment-list.component.scss'
})
export class SegmentListComponent implements OnInit {
  private readonly segmentService = inject(SegmentService);
  private readonly snackBar = inject(MatSnackBar);

  segments = this.segmentService.segments;
  loading = this.segmentService.isLoading;

  columns: CrmColumn[] = [
    { key: 'name', label: 'Название', sortable: true },
    { key: 'description', label: 'Описание', template: 'descriptionTemplate' },
    { key: 'contactsCount', label: 'Контактов', template: 'contactCountTemplate' },
    { key: 'filterCount', label: 'Фильтров', template: 'filterCountTemplate' },
    { key: 'actions', label: 'Действия', template: 'actionsTemplate' },
  ];

  ngOnInit() {
    this.loadSegments();
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
