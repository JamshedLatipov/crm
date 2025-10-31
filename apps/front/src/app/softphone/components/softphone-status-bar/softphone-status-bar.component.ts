import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-softphone-status-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './softphone-status-bar.component.html'
})
export class SoftphoneStatusBarComponent {
  status = input('');
  callActive = input(false);
}