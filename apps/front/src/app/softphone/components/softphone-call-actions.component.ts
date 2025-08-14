import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-softphone-call-actions',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-3 gap-4 w-full">
      <!-- Connect / Call -->
      <button (click)="connect.emit()" *ngIf="!status.includes('Registered') && !callActive"
        class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg bg-[var(--primary-color)] hover:bg-blue-700 transition-all text-white">
        <span class="material-icons">login</span>
        <span class="text-xs font-medium">Подключиться</span>
      </button>
      <button (click)="call.emit()" *ngIf="status.includes('Registered') && !callActive"
        class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg bg-green-600 hover:bg-green-700 transition-all text-white">
        <span class="material-icons">call</span>
        <span class="text-xs font-medium">Позвонить</span>
      </button>

      <!-- Active call controls -->
      <ng-container *ngIf="callActive">
        <button (click)="holdToggle.emit()" [disabled]="holdInProgress"
          class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg transition-all"
          [ngClass]="holdInProgress ? 'bg-amber-300 text-white animate-pulse' : onHold ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-[var(--muted-color)] hover:bg-gray-200 text-[var(--text-primary)]'"
          [attr.aria-pressed]="onHold" [attr.aria-busy]="holdInProgress">
          <span class="material-icons">{{ holdInProgress ? 'hourglass_empty' : (onHold ? 'play_arrow' : 'pause') }}</span>
          <span class="text-xs font-medium">{{ holdInProgress ? '...' : (onHold ? 'Возобновить' : 'Удержание') }}</span>
        </button>
        <button (click)="muteToggle.emit()"
          class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg transition-all text-white"
          [ngClass]="muted ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-[var(--muted-color)] hover:bg-gray-200 text-[var(--text-primary)]'"
          [attr.aria-pressed]="muted">
          <span class="material-icons">{{ muted ? 'mic' : 'mic_off' }}</span>
            <span class="text-xs font-medium">{{ muted ? 'Со звуком' : 'Без звука' }}</span>
        </button>
        <button (click)="hangup.emit()"
          class="flex flex-col items-center justify-center gap-2 p-3 rounded-lg bg-red-600 hover:bg-red-700 transition-all text-white">
          <span class="material-icons">call_end</span>
          <span class="text-xs font-medium">Сбросить</span>
        </button>
      </ng-container>
    </div>
  `
})
export class SoftphoneCallActionsComponent {
  @Input() status = '';
  @Input() callActive = false;
  @Input() muted = false;
  @Input() onHold = false;
  @Input() holdInProgress = false;
  @Output() connect = new EventEmitter<void>();
  @Output() call = new EventEmitter<void>();
  @Output() hangup = new EventEmitter<void>();
  @Output() muteToggle = new EventEmitter<void>();
  @Output() holdToggle = new EventEmitter<void>();
}
