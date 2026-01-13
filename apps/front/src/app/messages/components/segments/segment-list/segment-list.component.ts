import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../../shared/components/crm-table/crm-table.component';
import { SegmentService } from '../../../../shared/services/segment.service';
import { Segment, SegmentUsageType, FilterGroup, FilterCondition, SegmentFilter } from '../../../../shared/models/segment.models';

@Component({
  selector: 'app-segment-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatSnackBarModule,
    PageLayoutComponent,
    CrmTableComponent,
    CrmColumnTemplateDirective,
  ],
  templateUrl: './segment-list.component.html',
  styleUrls: ['./segment-list.component.scss'],
})
export class SegmentListComponent implements OnInit {
  private readonly segmentService = inject(SegmentService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // Signals
  readonly segments = this.segmentService.segments;
  readonly isLoading = this.segmentService.isLoading;
  readonly error = this.segmentService.error;

  // Table columns
  columns: CrmColumn[] = [
    { 
      key: 'name', 
      label: 'Название сегмента', 
      template: 'nameTemplate',
      width: '35%'
    },
    { 
      key: 'usageType', 
      label: 'Тип использования', 
      template: 'usageTypeTemplate',
      width: '15%'
    },
    { 
      key: 'contactsCount', 
      label: 'Количество контактов', 
      template: 'contactsCountTemplate',
      width: '15%'
    },
    { 
      key: 'isActive', 
      label: 'Статус', 
      template: 'isActiveTemplate',
      width: '15%'
    },
    { 
      key: 'actions', 
      label: '', 
      template: 'actionsTemplate',
      width: '10%'
    },
  ];

  ngOnInit(): void {
    this.loadSegments();
  }

  loadSegments(): void {
    this.segmentService.getAll().subscribe({
      error: (error) => {
        this.snackBar.open('Ошибка загрузки сегментов', 'Закрыть', {
          duration: 3000,
        });
      },
    });
  }

  createSegment(): void {
    this.router.navigate(['/messages/segments/new']);
  }

  editSegment(segment: Segment): void {
    this.router.navigate(['/messages/segments', segment.id]);
  }

  viewContacts(segment: Segment): void {
    this.router.navigate(['/messages/segments', segment.id, 'contacts']);
  }

  deleteSegment(segment: Segment): void {
    if (confirm(`Вы уверены, что хотите удалить сегмент "${segment.name}"?`)) {
      this.segmentService.delete(segment.id).subscribe({
        next: () => {
          this.snackBar.open('Сегмент удален', 'Закрыть', { duration: 2000 });
          this.loadSegments();
        },
        error: () => {
          this.snackBar.open('Ошибка удаления сегмента', 'Закрыть', {
            duration: 3000,
          });
        },
      });
    }
  }

  duplicateSegment(segment: Segment): void {
    // Convert old format to new format if needed
    let filters: FilterGroup;
    
    if (Array.isArray(segment.filters)) {
      // Old format: array of filters
      // Конвертируем в новый формат
      const conditions: FilterCondition[] = segment.filters.map((filter, index) => ({
        item: filter,
        logicOperator: index === 0 ? 'AND' : (segment.filterLogic || 'AND')
      }));
      
      filters = {
        conditions: conditions
      };
    } else if (segment.filters && 'conditions' in segment.filters) {
      // Проверяем, новый ли формат уже
      if (segment.filters.conditions.length > 0 && 'item' in segment.filters.conditions[0]) {
        // Уже новый формат
        filters = segment.filters as FilterGroup;
      } else {
        // Старый формат FilterGroup
        const oldLogic = (segment.filters as any).logic || 'AND';
        const conditions: FilterCondition[] = (segment.filters.conditions as any[]).map((cond, index) => ({
          item: cond,
          logicOperator: index === 0 ? 'AND' : oldLogic
        }));
        
        filters = {
          conditions: conditions
        };
      }
    } else {
      // Пустые фильтры
      filters = {
        conditions: []
      };
    }
    
    const duplicatedSegment = {
      name: `${segment.name} (копия)`,
      description: segment.description,
      filters: filters,
      isDynamic: segment.isDynamic,
      isActive: segment.isActive
    };
    
    this.segmentService.create(duplicatedSegment as any).subscribe({
      next: () => {
        this.snackBar.open('Сегмент скопирован', 'Закрыть', { duration: 2000 });
        this.loadSegments();
      },
      error: () => {
        this.snackBar.open('Ошибка копирования сегмента', 'Закрыть', {
          duration: 3000,
        });
      },
    });
  }

  getUsageTypeLabel(type: SegmentUsageType): string {
    const labels: Record<SegmentUsageType, string> = {
      [SegmentUsageType.SMS]: 'SMS',
      [SegmentUsageType.CAMPAIGN]: 'Кампания',
      [SegmentUsageType.EMAIL]: 'Email',
      [SegmentUsageType.WHATSAPP]: 'WhatsApp',
      [SegmentUsageType.TELEGRAM]: 'Telegram',
      [SegmentUsageType.GENERAL]: 'Общий',
    };
    return labels[type] || type;
  }

  getUsageTypeIcon(type: SegmentUsageType): string {
    const icons: Record<SegmentUsageType, string> = {
      [SegmentUsageType.SMS]: 'sms',
      [SegmentUsageType.CAMPAIGN]: 'campaign',
      [SegmentUsageType.EMAIL]: 'email',
      [SegmentUsageType.WHATSAPP]: 'chat',
      [SegmentUsageType.TELEGRAM]: 'telegram',
      [SegmentUsageType.GENERAL]: 'folder',
    };
    return icons[type] || 'label';
  }

  getUsageTypeColor(type: SegmentUsageType): string {
    const colors: Record<SegmentUsageType, string> = {
      [SegmentUsageType.SMS]: 'primary',
      [SegmentUsageType.CAMPAIGN]: 'accent',
      [SegmentUsageType.EMAIL]: 'warn',
      [SegmentUsageType.WHATSAPP]: 'primary',
      [SegmentUsageType.TELEGRAM]: 'accent',
      [SegmentUsageType.GENERAL]: '',
    };
    return colors[type] || '';
  }
}
