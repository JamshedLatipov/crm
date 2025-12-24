import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-softphone-call-actions',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
  changeDetection: ChangeDetectionStrategy.Default,
  templateUrl: './softphone-call-actions.component.html',
  styleUrls: ['./softphone-call-actions.component.scss']
})
export class SoftphoneCallActionsComponent {
  status = input('');
  callActive = input(false);
  muted = input(false);
  onHold = input(false);
  holdInProgress = input(false);
  // Transfer inputs/outputs: parent can bind [(transferTarget)] and listen for transfer events
  transferTarget = input('');
  transferTargetChange = output<string>();
  transfer = output<'blind' | 'attended'>();
  // DTMF inputs/outputs
  dtmfSequence = input('');
  pressKey = output<string>();
  clearDtmf = output<void>();
  connect = output<void>();
  call = output<void>();
  hangup = output<void>();
  muteToggle = output<void>();
  holdToggle = output<void>();

  // Computed signals moved from template
  readonly holdButtonClass = computed(() => {
    if (this.holdInProgress()) return 'hold-pulse';
    if (this.onHold()) return 'hold-active';
    return '';
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
    this.muted() ? 'mute-active' : ''
  );

  readonly muteIcon = computed(() => (this.muted() ? 'mic' : 'mic_off'));

  readonly muteLabel = computed(() => (this.muted() ? 'Со звуком' : 'Без звука'));
}
