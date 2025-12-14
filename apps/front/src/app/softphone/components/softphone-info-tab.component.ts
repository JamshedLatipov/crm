import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CallInfoCardComponent } from '../../integrations';

@Component({
  selector: 'app-softphone-info-tab',
  standalone: true,
  imports: [CommonModule, CallInfoCardComponent],
  host: { 'class': 'info-tab-content' },
  template: `
    <div style="overflow-y: auto; max-height: 400px;">
      <app-call-info-card [phone]="phone"></app-call-info-card>
    </div>
  `,
})
export class SoftphoneInfoTabComponent {
  @Input() phone: string | null = null;
}
