import { Component, input, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { IntegrationService, StandardizedCallInfo } from '../../services/integration.service';

@Component({
  selector: 'app-call-info-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTabsModule
  ],
  templateUrl: './call-info-card.component.html',
  styleUrls: ['./call-info-card.component.scss']
})
export class CallInfoCardComponent {
  phone = input<string>('');
  
  private integrationService = inject(IntegrationService);
  
  callInfo = signal<StandardizedCallInfo | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const phoneNumber = this.phone();
      if (phoneNumber) {
        this.fetchInfo(phoneNumber);
      } else {
        this.callInfo.set(null);
      }
    });
  }

  private fetchInfo(phone: string) {
    this.loading.set(true);
    this.error.set(null);
    
    this.integrationService.getCallInfo(phone).subscribe({
      next: (data) => {
        this.callInfo.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Failed to load client info');
        this.loading.set(false);
      }
    });
  }

  getColumns(section: any): string[] {
    return section.ui.columns?.map((c: any) => c.key) || [];
  }
  
  getColumnLabel(section: any, key: string): string {
    return section.ui.columns?.find((c: any) => c.key === key)?.label || key;
  }

  openExternalUrl() {
    const url = this.callInfo()?.externalUrl;
    if (url) {
      window.open(url, '_blank');
    }
  }
}
