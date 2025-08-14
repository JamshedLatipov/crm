import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-softphone-call-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <h2 class="text-xl font-bold">Вызов с {{ callee }}</h2>
      <div class="flex items-center justify-between text-[var(--text-secondary)] flex-wrap gap-y-2">
        <div class="flex items-center gap-2">
          <span class="material-icons text-base">call</span>
          <span>Активный вызов - {{ callDuration }}</span>
        </div>
      </div>
    </div>
  `
})
export class SoftphoneCallInfoComponent {
  @Input() callee = '';
  @Input() callDuration = '00:00';
}
