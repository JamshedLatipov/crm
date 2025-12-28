import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
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
    AgentPerformanceComponent,
    CallsOverviewComponent,
    SlaMetricsComponent,
    AbandonedCallsComponent,
    QueuePerformanceComponent,
    IvrAnalysisComponent,
    CallConversionComponent,
  ],
  template: `
    <div class="analytics-dashboard">
      <mat-tab-group animationDuration="300ms">
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>assessment</mat-icon>
            <span>Общая статистика</span>
          </ng-template>
          <app-calls-overview></app-calls-overview>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>people</mat-icon>
            <span>Производительность операторов</span>
          </ng-template>
          <app-agent-performance></app-agent-performance>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>verified</mat-icon>
            <span>SLA метрики</span>
          </ng-template>
          <app-sla-metrics></app-sla-metrics>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>phone_missed</mat-icon>
            <span>Брошенные звонки</span>
          </ng-template>
          <app-abandoned-calls></app-abandoned-calls>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>queue</mat-icon>
            <span>Эффективность очередей</span>
          </ng-template>
          <app-queue-performance></app-queue-performance>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>phone_forwarded</mat-icon>
            <span>Анализ IVR</span>
          </ng-template>
          <app-ivr-analysis></app-ivr-analysis>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>trending_up</mat-icon>
            <span>Конверсия звонков</span>
          </ng-template>
          <app-call-conversion></app-call-conversion>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .analytics-dashboard {
      min-height: calc(100vh - 64px);
      background: #f5f5f5;
    }

    mat-tab-group {
      ::ng-deep {
        .mat-mdc-tab-labels {
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .mat-mdc-tab-label {
          min-width: 200px;
          height: 64px;
          
          mat-icon {
            margin-right: 8px;
          }
        }

        .mat-mdc-tab-body-wrapper {
          padding-top: 24px;
        }
      }
    }
  `],
})
export class AnalyticsDashboardComponent {}
