import { Component, OnInit, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../../environments/environment';

interface AudioFile {
  id: string;
  name: string;
  filename: string;
  size?: number;
  createdAt?: string;
}

@Component({
  selector: 'app-audio-file-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatListModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './audio-file-selector.component.html',
  styleUrls: ['./audio-file-selector.component.scss'],
})
export class AudioFileSelectorComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<AudioFileSelectorComponent>);

  loading = signal(false);
  uploading = signal(false);
  uploadProgress = signal(0);
  files = signal<AudioFile[]>([]);
  selectedFile = signal<AudioFile | null>(null);
  dragOver = signal(false);

  private readonly apiUrl = `${environment.apiBase}/ivr/media`;

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.loading.set(true);
    this.http.get<AudioFile[]>(this.apiUrl).subscribe({
      next: (files) => {
        this.files.set(files);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading audio files:', err);
        this.snackBar.open('Ошибка загрузки файлов', 'ОК', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile(input.files[0]);
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
      this.uploadFile(event.dataTransfer.files[0]);
    }
  }

  uploadFile(file: File): void {
    // Validate file type
    const allowedTypes = ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'];
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.wav')) {
      this.snackBar.open('Поддерживаются только WAV и MP3 файлы', 'ОК', { duration: 3000 });
      return;
    }

    // Validate file size (8MB max)
    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      this.snackBar.open('Размер файла не должен превышать 8MB', 'ОК', { duration: 3000 });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.uploading.set(true);
    this.uploadProgress.set(0);

    this.http.post(`${this.apiUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events',
    }).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total) {
            this.uploadProgress.set(Math.round((100 * event.loaded) / event.total));
          }
        } else if (event.type === HttpEventType.Response) {
          this.snackBar.open('Файл успешно загружен', 'ОК', { duration: 3000 });
          this.uploading.set(false);
          this.uploadProgress.set(0);
          this.loadFiles();
        }
      },
      error: (err) => {
        console.error('Error uploading file:', err);
        this.snackBar.open('Ошибка загрузки файла', 'ОК', { duration: 3000 });
        this.uploading.set(false);
        this.uploadProgress.set(0);
      },
    });
  }

  selectFile(file: AudioFile): void {
    this.selectedFile.set(file);
  }

  deleteFile(file: AudioFile, event: Event): void {
    event.stopPropagation();

    if (!confirm(`Удалить файл "${file.name}"?`)) {
      return;
    }

    this.http.delete(`${this.apiUrl}/${file.id}`).subscribe({
      next: () => {
        this.snackBar.open('Файл удален', 'ОК', { duration: 3000 });
        this.loadFiles();
        if (this.selectedFile()?.id === file.id) {
          this.selectedFile.set(null);
        }
      },
      error: (err) => {
        console.error('Error deleting file:', err);
        this.snackBar.open('Ошибка удаления файла', 'ОК', { duration: 3000 });
      },
    });
  }

  confirm(): void {
    const file = this.selectedFile();
    if (file) {
      this.dialogRef.close(file);
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('ru-RU');
  }
}
