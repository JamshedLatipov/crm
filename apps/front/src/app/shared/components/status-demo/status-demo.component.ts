import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { DealStatusComponent, DealStatus } from '../deal-status/deal-status.component';

@Component({
  selector: 'app-status-demo',
  standalone: true,
  imports: [CommonModule, MatCardModule, DealStatusComponent],
  templateUrl: './status-demo.component.html',
  styleUrls: ['./status-demo.component.scss']
})
export class StatusDemoComponent {}
