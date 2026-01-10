import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { AgentPerformanceComponent } from '../../reports/agent-performance/agent-performance.component';
import { CallsOverviewComponent } from '../../reports/calls-overview/calls-overview.component';
import { SlaMetricsComponent } from '../../reports/sla-metrics/sla-metrics.component';
import { AbandonedCallsComponent } from '../../reports/abandoned-calls/abandoned-calls.component';
import { QueuePerformanceComponent } from '../../reports/queue-performance/queue-performance.component';
import { IvrAnalysisComponent } from '../../reports/ivr-analysis/ivr-analysis.component';
import { CallConversionComponent } from '../../reports/call-conversion/call-conversion.component';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTabsModule,
    MatIconModule,
    PageLayoutComponent,
    AgentPerformanceComponent,
    CallsOverviewComponent,
    SlaMetricsComponent,
    AbandonedCallsComponent,
    QueuePerformanceComponent,
    IvrAnalysisComponent,
    CallConversionComponent,
  ],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss'],
})
export class AnalyticsDashboardComponent {}
