import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PipelineAnalytics } from '../../../dtos';

@Component({
  selector: 'app-analytics-summary',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './analytics-summary.component.html',
  styleUrls: ['./analytics-summary.component.scss']
})
export class AnalyticsSummaryComponent {
  @Input() analytics: PipelineAnalytics | null = null;
}
