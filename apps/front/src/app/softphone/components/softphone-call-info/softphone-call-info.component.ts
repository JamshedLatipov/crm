import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-softphone-call-info',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './softphone-call-info.component.html',
  styles: [`
    :host {
      display: block;
    }
    .call-info-card {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%);
      border: 1px solid rgba(59, 130, 246, 0.1);
      border-radius: 12px;
      padding: 1.5rem;
      position: relative;
      overflow: hidden;
    }
    .call-info-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      animation: shimmer 2s infinite;
    }
    @keyframes shimmer {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .timer-display {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 0.05em;
      text-align: center;
      margin: 1rem 0;
    }
    .pulse-indicator {
      width: 12px;
      height: 12px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 2s infinite;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    }
    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
      }
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .status-badge.muted {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    .status-badge.on-hold {
      background: rgba(245, 158, 11, 0.1);
      color: #f59e0b;
    }
    .contact-name {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      text-align: center;
    }
    .contact-number {
      font-size: 0.875rem;
      color: var(--text-secondary);
      text-align: center;
    }
  `]
})
export class SoftphoneCallInfoComponent {
  callee = input('');
  callDuration = input('00:00');
  muted = input(false);
  onHold = input(false);
  contactName = input<string | null>(null);
  contactCompany = input<string | null>(null);
}