import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

interface UploadResult {
  added: number;
  skipped: number;
  errors?: string[];
}

@Component({
  selector: 'app-contacts-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatSnackBarModule,
  ],
  templateUrl: './contacts-upload.component.html',
  styleUrls: ['./contacts-upload.component.scss'],
})
export class ContactsUploadComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  campaignId = signal<string>('');
  uploading = signal(false);
  uploadProgress = signal(0);
  uploadResult = signal<UploadResult | null>(null);
  selectedFile = signal<File | null>(null);
  dragOver = signal(false);

  private readonly apiUrl = `${environment.apiBase}/contact-center/campaigns`;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.campaignId.set(id);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.selectedFile.set(event.dataTransfer.files[0]);
    }
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.uploadResult.set(null);
  }

  uploadFile(): void {
    const file = this.selectedFile();
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.snackBar.open('Поддерживаются только CSV файлы', 'ОК', { duration: 3000 });
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.snackBar.open('Размер файла не должен превышать 5MB', 'ОК', { duration: 3000 });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.uploading.set(true);
    this.uploadProgress.set(0);

    this.http.post<UploadResult>(
      `${this.apiUrl}/${this.campaignId()}/contacts/upload`,
      formData,
      {
        reportProgress: true,
        observe: 'events',
      }
    ).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total) {
            this.uploadProgress.set(Math.round((100 * event.loaded) / event.total));
          }
        } else if (event.type === HttpEventType.Response) {
          this.uploadResult.set(event.body);
          this.snackBar.open(
            `Загружено: ${event.body?.added}, Пропущено: ${event.body?.skipped}`,
            'ОК',
            { duration: 5000 }
          );
          this.uploading.set(false);
          this.uploadProgress.set(0);
        }
      },
      error: (err) => {
        console.error('Error uploading contacts:', err);
        this.snackBar.open('Ошибка загрузки контактов', 'ОК', { duration: 3000 });
        this.uploading.set(false);
        this.uploadProgress.set(0);
      },
    });
  }

  back(): void {
    this.router.navigate(['/contact-center/campaigns']);
  }

  downloadTemplate(): void {
    const csvContent = 'phone,name,customData\n+71234567890,Иван Иванов,{"city":"Moscow"}\n+79876543210,Петр Петров,{"city":"SPb"}';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'contacts_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
