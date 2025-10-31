import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-softphone-status-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-2 mb-2">
      <span [class]="status().includes('Registered') ? 'inline-block w-2.5 h-2.5 rounded-full bg-green-500' :
        (status().includes('failed') || status().includes('Ошибка') ? 'inline-block w-2.5 h-2.5 rounded-full bg-red-500' :
        'inline-block w-2.5 h-2.5 rounded-full bg-yellow-500')"></span>
      <span class="text-sm font-medium text-[var(--text-secondary)]">{{ status() }}</span>
    </div>
  `
})
export class SoftphoneStatusBarComponent {
  status = input('');
  callActive = input(false);
}
