import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
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
}