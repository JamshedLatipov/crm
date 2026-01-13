import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../../shared/components/crm-table/crm-table.component';
import { SegmentService } from '../../../../shared/services/segment.service';
import { SegmentContact } from '../../../../shared/models/segment.models';

@Component({
  selector: 'app-segment-contacts',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    PageLayoutComponent,
    CrmTableComponent,
    CrmColumnTemplateDirective,
  ],
  templateUrl: './segment-contacts.component.html',
  styleUrls: ['./segment-contacts.component.scss'],
})
export class SegmentContactsComponent implements OnInit {
  private readonly segmentService = inject(SegmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // Signals
  readonly contacts = signal<SegmentContact[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly segmentId = signal<string | null>(null);
  readonly segmentName = signal<string>('');
  readonly totalContacts = signal(0);

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = signal(20);

  // Table columns
  columns: CrmColumn[] = [
    { key: 'name', label: 'Имя', template: 'nameTemplate' },
    { key: 'phone', label: 'Телефон', template: 'phoneTemplate' },
    { key: 'email', label: 'Email', template: 'emailTemplate' },
    { key: 'company', label: 'Компания', template: 'companyTemplate' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.segmentId.set(id);
      this.loadSegmentInfo(id);
      this.loadContacts(id);
    }
  }

  loadSegmentInfo(id: string): void {
    this.segmentService.getById(id).subscribe({
      next: (segment) => {
        this.segmentName.set(segment.name);
        this.totalContacts.set(segment.contactsCount || 0);
      },
      error: (error) => {
        this.snackBar.open('Ошибка загрузки информации о сегменте', 'Закрыть', {
          duration: 3000,
        });
      },
    });
  }

  loadContacts(id: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.segmentService
      .getContacts(id, this.currentPage(), this.pageSize())
      .subscribe({
        next: (response) => {
          this.contacts.set(response.data);
          this.totalContacts.set(response.total);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.error.set('Ошибка загрузки контактов');
          this.isLoading.set(false);
          this.snackBar.open('Ошибка загрузки контактов', 'Закрыть', {
            duration: 3000,
          });
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/messages/segments']);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    if (this.segmentId()) {
      this.loadContacts(this.segmentId()!);
    }
  }
}
