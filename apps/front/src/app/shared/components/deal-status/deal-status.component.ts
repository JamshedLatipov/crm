import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

export type DealStatus = 'open' | 'won' | 'lost';

export interface DealStatusConfig {
  label: string;
  icon: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

@Component({
  selector: 'app-deal-status',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatChipsModule, MatTooltipModule],
  templateUrl: './deal-status.component.html',
  styleUrls: ['./deal-status.component.scss']
})
export class DealStatusComponent {
  @Input() status: DealStatus = 'open';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showIndicators = false;
  @Input() isOverdue = false;
  @Input() isHighValue = false;
  @Input() isHot = false;

  private readonly statusConfigs: Record<DealStatus, DealStatusConfig> = {
    open: {
      label: 'Открыта',
      icon: 'radio_button_unchecked',
      color: '#2196f3',
      backgroundColor: '#e3f2fd',
      borderColor: '#2196f3',
      textColor: '#1565c0'
    },
    won: {
      label: 'Выиграна',
      icon: 'check_circle',
      color: '#4caf50',
      backgroundColor: '#e8f5e8',
      borderColor: '#4caf50',
      textColor: '#2e7d32'
    },
    lost: {
      label: 'Проиграна',
      icon: 'cancel',
      color: '#f44336',
      backgroundColor: '#ffebee',
      borderColor: '#f44336',
      textColor: '#c62828'
    }
  };

  get config(): DealStatusConfig {
    return this.statusConfigs[this.status] || this.statusConfigs.open;
  }
}
