import { Component, input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-softphone-status-bar',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatButtonModule, MatIconModule, MatDividerModule],
  templateUrl: './softphone-status-bar.component.html',
  styles: [
    `:host .status-text { color: #fff; transition: all 0.3s; }`,
    `:host .status-text.call-active { 
      font-weight: 600;
      text-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }`,
    `:host .pulse-dot {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 2s infinite;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    }`,
    `@keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      50% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
    }`,
    `:host ::ng-deep .softphone-pause-menu .mat-menu-content { background: transparent; color: #fff; }`,
    `:host ::ng-deep .softphone-pause-menu .mat-menu-item { color: #fff; }`,
    `:host ::ng-deep .softphone-pause-menu .mat-divider { border-color: rgba(255,255,255,0.12); }`,
    `:host ::ng-deep .softphone-pause-menu { min-width: 350px; }`,
  ],
})
export class SoftphoneStatusBarComponent {
  status = input('');
  callActive = input(false);
  // pause inputs
  paused = input(false);
  reason = input('');

  // Emit pause change events: { paused: boolean, reason?: string }
  @Output() pauseChange = new EventEmitter<{
    paused: boolean;
    reason?: string;
  }>();

  reasons = ['Обед', 'Уборная', 'Перекур', 'Совещание', 'Другое'];

  selectReason(r: string) {
    this.pauseChange.emit({ paused: true, reason: r });
  }

  clearPause() {
    this.pauseChange.emit({ paused: false });
  }
}
