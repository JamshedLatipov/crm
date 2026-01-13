import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../../environments/environment';

interface ContactSegment {
  id: string;
  name: string;
  description?: string;
  contactsCount: number;
  isActive: boolean;
}

interface UploadResult {
  added: number;
  skipped: number;
}

type ContactSource = 'csv' | 'segment' | 'all';

@Component({
  selector: 'app-contact-source-selector',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
  ],
  templateUrl: './contact-source-selector.component.html',
  styleUrls: ['./contact-source-selector.component.scss'],
})
export class ContactSourceSelectorComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  private readonly apiUrl = `${environment.apiBase}/contact-center/campaigns`;
  private readonly segmentsApiUrl = `${environment.apiBase}/segments`;

  campaignId = signal<string>('');
  selectedSource = signal<ContactSource>('csv');
  loading = signal(false);
  segments = signal<ContactSegment[]>([]);
  selectedSegmentId = signal<string>('');
  selectedFile = signal<File | null>(null);
  uploadProgress = signal(0);
  uploadResult = signal<UploadResult | null>(null);
  searchTerm = signal<string>('');

  loadingSegments = computed(() => this.selectedSource() === 'segment' && this.segments().length === 0);
  
  selectedSegment = computed(() => {
    const segmentId = this.selectedSegmentId();
    return this.segments().find(s => s.id === segmentId);
  });

  selectedSegmentContactsCount = computed(() => {
    return this.selectedSegment()?.contactsCount || 0;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.campaignId.set(id);
    }
    this.loadSegments();
  }

  loadSegments(): void {
    this.http.get<{ data: ContactSegment[]; total: number }>(
      `${this.segmentsApiUrl}?isActive=true&limit=100`
    ).subscribe({
      next: (response) => {
        this.segments.set(response.data.filter(s => s.contactsCount > 0));
      },
      error: (err) => {
        console.error('Error loading segments:', err);
      },
    });
  }

  onSourceChange(source: ContactSource): void {
    this.selectedSource.set(source);
    this.uploadResult.set(null);
  }

  onSegmentChange(segmentId: string): void {
    this.selectedSegmentId.set(segmentId);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  loadFromSegment(): void {
    if (!this.selectedSegmentId()) {
      this.snackBar.open('Выберите сегмент', 'ОК', { duration: 3000 });
      return;
    }

    this.loading.set(true);

    this.http.post<UploadResult>(
      `${this.apiUrl}/${this.campaignId()}/contacts/from-segment/${this.selectedSegmentId()}`,
      {}
    ).subscribe({
      next: (result) => {
        this.uploadResult.set(result);
        this.snackBar.open(
          `Загружено: ${result.added}, Пропущено: ${result.skipped}`,
          'ОК',
          { duration: 5000 }
        );
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading contacts from segment:', err);
        this.snackBar.open('Ошибка загрузки контактов из сегмента', 'ОК', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  loadAllContacts(): void {
    this.loading.set(true);

    this.http.post<UploadResult>(
      `${this.apiUrl}/${this.campaignId()}/contacts/from-system`,
      {}
    ).subscribe({
      next: (result) => {
        this.uploadResult.set(result);
        this.snackBar.open(
          `Загружено: ${result.added}, Пропущено: ${result.skipped}`,
          'ОК',
          { duration: 5000 }
        );
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading all contacts:', err);
        this.snackBar.open('Ошибка загрузки контактов', 'ОК', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  uploadCsvFile(): void {
    const file = this.selectedFile();
    if (!file) {
      this.snackBar.open('Выберите CSV файл', 'ОК', { duration: 3000 });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.snackBar.open('Поддерживаются только CSV файлы', 'ОК', { duration: 3000 });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.snackBar.open('Размер файла не должен превышать 5MB', 'ОК', { duration: 3000 });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.loading.set(true);

    this.http.post<UploadResult>(
      `${this.apiUrl}/${this.campaignId()}/contacts/upload`,
      formData
    ).subscribe({
      next: (result) => {
        this.uploadResult.set(result);
        this.snackBar.open(
          `Загружено: ${result.added}, Пропущено: ${result.skipped}`,
          'ОК',
          { duration: 5000 }
        );
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error uploading CSV:', err);
        this.snackBar.open('Ошибка загрузки CSV файла', 'ОК', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  proceed(): void {
    if (this.selectedSource() === 'csv') {
      this.uploadCsvFile();
    } else if (this.selectedSource() === 'segment') {
      this.loadFromSegment();
    } else if (this.selectedSource() === 'all') {
      this.loadAllContacts();
    }
  }

  canProceed(): boolean {
    if (this.loading()) return false;
    
    if (this.selectedSource() === 'csv') {
      return this.selectedFile() !== null;
    } else if (this.selectedSource() === 'segment') {
      return this.selectedSegmentId() !== '';
    } else if (this.selectedSource() === 'all') {
      return true;
    }
    
    return false;
  }

  back(): void {
    this.router.navigate(['/contact-center/campaigns']);
  }

  goToContacts(): void {
    this.router.navigate(['/contact-center/campaigns', this.campaignId(), 'contacts']);
  }
}
