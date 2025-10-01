import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export type LeadTemperature = 'cold' | 'warm' | 'hot';

export interface LeadScoreData {
  totalScore: number;
  temperature: LeadTemperature;
  lastCalculatedAt?: Date;
  criteria?: any;
}

@Component({
  selector: 'app-lead-score-badge',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="lead-score-badge" 
         [class]="'lead-score-badge--' + temperature"
         [matTooltip]="tooltipText"
         matTooltipPosition="above">
      
      <div class="lead-score-badge__icon">
        <mat-icon>{{ getTemperatureIcon() }}</mat-icon>
      </div>
      
      <div class="lead-score-badge__content">
        <div class="lead-score-badge__score">{{ score }}</div>
        <div class="lead-score-badge__label">{{ getTemperatureLabel() }}</div>
      </div>
      
      <div class="lead-score-badge__progress" *ngIf="showProgress">
        <div class="lead-score-badge__progress-bar" 
             [style.width.%]="score">
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./lead-score-badge.component.scss']
})
export class LeadScoreBadgeComponent {
  @Input() score: number = 0;
  @Input() temperature: LeadTemperature = 'cold';
  @Input() lastCalculatedAt?: Date;
  @Input() showProgress: boolean = true;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() criteria?: any;

  get tooltipText(): string {
    const lastUpdated = this.lastCalculatedAt 
      ? new Date(this.lastCalculatedAt).toLocaleString('ru-RU')
      : 'Не рассчитывался';
    
    return `Lead Score: ${this.score}/100
Температура: ${this.getTemperatureLabel()}
Последнее обновление: ${lastUpdated}`;
  }

  getTemperatureIcon(): string {
    switch (this.temperature) {
      case 'hot':
        return 'local_fire_department';
      case 'warm':
        return 'thermostat';
      case 'cold':
        return 'ac_unit';
      default:
        return 'help_outline';
    }
  }

  getTemperatureLabel(): string {
    switch (this.temperature) {
      case 'hot':
        return 'Горячий';
      case 'warm':
        return 'Теплый';
      case 'cold':
        return 'Холодный';
      default:
        return 'Неизвестно';
    }
  }
}