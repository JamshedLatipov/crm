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
  styles: [
    `:host { display: block; }
    .actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(56px, 1fr)); gap: 0.25rem; align-items: center; }
    .action-btn { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.15rem; min-width:56px; height:56px; padding:6px; }
    .action-btn .material-icons { font-size:18px; }
    .action-label { font-size:0.68rem; line-height:1; }
    @media (max-width: 420px) {
      .action-label { display:none; }
      .action-btn { height:48px; min-width:48px; }
    }
    .hold-active { background-color: rgba(2,132,199,0.12); border-radius:16px; }
    .hold-pulse { background-color: rgba(245,158,11,0.9); color:white; border-radius:16px; box-shadow: 0 0 0 4px rgba(245,158,11,0.15); }
    .mute-active { background-color: rgba(99,102,241,0.12); border-radius:16px; }
    .transfer-controls { display:flex; gap:0.5rem; align-items:center; margin-top:0.5rem; }
    .transfer-controls input { flex:1; padding:0.5rem; border-radius:4px; border:1px solid rgba(0,0,0,0.12); }
    .transfer-buttons { display:flex; gap:0.5rem; }
    mat-menu .mat-menu-content { padding:0.5rem; }
    mat-menu button[mat-menu-item] { width:56px; height:40px; display:flex; align-items:center; justify-content:center; }
    `
  ]
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