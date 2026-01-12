import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { MessageBackButtonComponent } from '../../shared/message-back-button/message-back-button.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../../shared/components/crm-table/crm-table.component';
import { SegmentService } from '../../../services/segment.service';
import { Segment } from '../../../models/message.models';

@Component({
  selector: 'app-segment-contacts',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    PageLayoutComponent,
    MessageBackButtonComponent
  ],
  templateUrl: './segment-contacts.component.html',
  styleUrl: './segment-contacts.component.scss'
})
export class SegmentContactsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly segmentService = inject(SegmentService);
  private readonly snackBar = inject(MatSnackBar);

  segmentId = signal<string | null>(null);
  segment = signal<Segment | null>(null);
  contacts = signal<any[]>([]);
  loading = signal(false);
  totalContacts = signal(0);
  currentPage = signal(1);
  pageSize = 20;

  columns: CrmColumn[] = [
    { key: 'name', label: 'Имя', sortable: true },
    { key: 'email', label: 'Email', template: 'emailTemplate' },
    { key: 'phone', label: 'Телефон', template: 'phoneTemplate' },
    { key: 'status', label: 'Статус', template: 'statusTemplate' },
    { key: 'createdAt', label: 'Дата создания', template: 'dateTemplate' },
  ];

  totalPages = computed(() => Math.ceil(this.totalContacts() / this.pageSize));

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.segmentId.set(id);
    
    if (id) {
      this.loadSegment(id);
      this.loadContacts(id);
    }
  }

  loadSegment(id: string) {
    this.segmentService.getById(id).subscribe({
      next: (segment) => {
        this.segment.set(segment);
      },
      error: () => {
        this.snackBar.open('Ошибка загрузки сегмента', 'Закрыть', { duration: 3000 });
      }
    });
  }

  loadContacts(id: string, page = 1) {
    this.loading.set(true);
    this.currentPage.set(page);
    
    this.segmentService.getContacts(id, page, this.pageSize).subscribe({
      next: (response) => {
        this.contacts.set(response.data);
        this.totalContacts.set(response.total);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Ошибка загрузки контактов', 'Закрыть', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  onPageChange(page: number) {
    if (this.segmentId()) {
      this.loadContacts(this.segmentId()!, page);
    }
  }

  goBack() {
    this.router.navigate(['/messages/segments']);
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('ru-RU');
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'active': 'success',
      'inactive': 'warn',
      'new': 'primary'
    };
    return colors[status] || 'default';
  }
}
