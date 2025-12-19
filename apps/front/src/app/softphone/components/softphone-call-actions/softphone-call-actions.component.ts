import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-softphone-call-actions',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
  changeDetection: ChangeDetectionStrategy.Default,
  templateUrl: './softphone-call-actions.component.html'
})
export class SoftphoneCallActionsComponent {
  status = input('');
  callActive = input(false);
  muted = input(false);
  onHold = input(false);
  holdInProgress = input(false);
  connect = output<void>();
  call = output<void>();
  hangup = output<void>();
  muteToggle = output<void>();
  holdToggle = output<void>();

  // Computed signals moved from template
  readonly holdButtonClass = computed(() => {
    if (this.holdInProgress()) return 'bg-amber-300 text-white animate-pulse';
    if (this.onHold()) return 'bg-amber-500 hover:bg-amber-600 text-white';
    return 'bg-[var(--muted-color)] hover:bg-gray-200 text-[var(--text-primary)]';
  });

  readonly holdIcon = computed(() => {
    if (this.holdInProgress()) return 'hourglass_empty';
    return this.onHold() ? 'play_arrow' : 'pause';
  });

  readonly holdLabel = computed(() => {
    if (this.holdInProgress()) return '...';
    return this.onHold() ? 'Возобновить' : 'Удержание';
  });

  readonly muteButtonClass = computed(() =>
    this.muted() ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-[var(--muted-color)] hover:bg-gray-200 text-[var(--text-primary)]'
  );

  readonly muteIcon = computed(() => (this.muted() ? 'mic' : 'mic_off'));

  readonly muteLabel = computed(() => (this.muted() ? 'Со звуком' : 'Без звука'));
}