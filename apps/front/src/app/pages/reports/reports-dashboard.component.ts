import { Component } from '@angular/core';
import { ReportsService } from '../../services/reports.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-reports-dashboard',
  template: `
    <div class="p-4">
      <h2>Reports Dashboard</h2>
      <div class="grid gap-4 grid-cols-2">
        <section>
          <h3>Leads Overview (30d)</h3>
          <pre>{{ leads | json }}</pre>
        </section>
        <section>
          <h3>Funnel</h3>
          <pre>{{ funnel | json }}</pre>
        </section>
        <section>
          <h3>Forecast (month)</h3>
          <pre>{{ forecast | json }}</pre>
        </section>
        <section>
          <h3>Tasks (30d)</h3>
          <pre>{{ tasks | json }}</pre>
        </section>
      </div>
    </div>
  `,
  imports: [CommonModule],
})
export class ReportsDashboardComponent {
  leads: any = null;
  funnel: any = null;
  forecast: any = null;
  tasks: any = null;

  constructor(private svc: ReportsService) {
    this.svc.leadsOverview(30).subscribe(r => (this.leads = r), e => console.error(e));
    this.svc.funnel().subscribe(r => (this.funnel = r), e => console.error(e));
    this.svc.forecast('month').subscribe(r => (this.forecast = r), e => console.error(e));
    this.svc.tasks(30).subscribe(r => (this.tasks = r), e => console.error(e));
  }
}
