import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '@crm/front/environments/environment';

export interface Media {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy?: string;
  createdAt: string;
}

export interface UploadProgress {
  progress: number;
  file?: Media;
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiBase + '/messages/media';

  uploading = signal(false);
  uploadProgress = signal(0);

  /**
   * Загрузить файл с отслеживанием прогресса
   */
  uploadFile(file: File): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file);

    this.uploading.set(true);
    this.uploadProgress.set(0);

    return this.http.post<Media>(`${this.apiUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<Media>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
            this.uploadProgress.set(progress);
            return { progress };

          case HttpEventType.Response:
            this.uploading.set(false);
            this.uploadProgress.set(100);
            return { progress: 100, file: event.body! };

          default:
            return { progress: this.uploadProgress() };
        }
      }),
      tap({
        error: () => {
          this.uploading.set(false);
          this.uploadProgress.set(0);
        }
      })
    );
  }

  /**
   * Получить список всех загруженных файлов
   */
  getAll(): Observable<Media[]> {
    return this.http.get<Media[]>(this.apiUrl);
  }

  /**
   * Получить информацию о файле
   */
  getById(id: string): Observable<Media> {
    return this.http.get<Media>(`${this.apiUrl}/${id}`);
  }

  /**
   * Удалить файл
   */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Проверка, является ли файл изображением
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Проверка, является ли файл видео
   */
  isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Проверка, является ли файл аудио
   */
  isAudio(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }

  /**
   * Форматирование размера файла
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
