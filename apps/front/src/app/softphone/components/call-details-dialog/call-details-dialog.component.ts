import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { CdrRecord } from '../../types/cdr.types';

@Component({
  selector: 'app-call-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule
  ],
  templateUrl: './call-details-dialog.component.html',
  styleUrls: ['./call-details-dialog.component.scss']
})
export class CallDetailsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CallDetailsDialogComponent>);
  readonly data = inject<CdrRecord>(MAT_DIALOG_DATA);

  getDirectionLabel(): string {
    const src = this.data.src || '';
    const dst = this.data.dst || '';
    
    if (dst.length <= 4 && /^\d+$/.test(dst) && src.length > 4) {
      return 'Входящий';
    }
    
    if (src.startsWith('+') || src.startsWith('00')) {
      return 'Входящий';
    }
    
    if (src.length > dst.length) {
      return 'Входящий';
    }
    
    return 'Исходящий';
  }

  getDispositionLabel(): string {
    switch (this.data.disposition) {
      case 'ANSWERED':
        return 'Отвечен';
      case 'NO ANSWER':
        return 'Без ответа';
      case 'BUSY':
        return 'Занято';
      case 'FAILED':
        return 'Ошибка';
      default:
        return this.data.disposition;
    }
  }

  getDispositionClass(): string {
    switch (this.data.disposition) {
      case 'ANSWERED':
        return 'status-answered';
      case 'NO ANSWER':
        return 'status-no-answer';
      case 'BUSY':
        return 'status-busy';
      case 'FAILED':
        return 'status-failed';
      default:
        return 'status-unknown';
    }
  }

  formatDuration(duration: number): string {
    if (!duration || duration === 0) {
      return '00:00';
    }

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
