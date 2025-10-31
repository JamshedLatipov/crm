import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-softphone-call-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './softphone-call-info.component.html'
})
export class SoftphoneCallInfoComponent {
  callee = input('');
  callDuration = input('00:00');
}