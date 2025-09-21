import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Contacts</h1>
        <p class="subtitle">Manage your customer contacts</p>
      </div>

      <mat-card class="coming-soon-card">
        <div class="coming-soon-content">
          <mat-icon class="large-icon">people</mat-icon>
          <h2>Contacts Module</h2>
          <p>Coming soon! This section will contain your contact management system.</p>
          <button mat-raised-button color="primary">
            <mat-icon>add</mat-icon>
            Add Contact
          </button>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .subtitle {
      color: #6b7280;
      font-size: 16px;
      margin: 0;
    }

    .coming-soon-card {
      padding: 64px;
      text-align: center;
      border-radius: 16px;
      border: 1px solid #e5e7eb;
    }

    .coming-soon-content {
      max-width: 400px;
      margin: 0 auto;
    }

    .large-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #a855f7;
      margin-bottom: 24px;
    }

    .coming-soon-content h2 {
      font-size: 24px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 16px 0;
    }

    .coming-soon-content p {
      color: #6b7280;
      margin: 0 0 32px 0;
      line-height: 1.6;
    }

    button {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 auto;
    }
  `]
})
export class ContactsComponent {
}
