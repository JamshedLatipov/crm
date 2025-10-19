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
  template: `
    <div class="deal-status-container">
      <mat-chip 
        [class]="'status-chip status-' + status + ' size-' + size"
        [style.background-color]="config.backgroundColor"
        [style.border-color]="config.borderColor"
        [style.color]="config.textColor">
        
        <div class="status-content">
          <div class="status-icon-wrapper">
            <mat-icon class="status-icon">{{ config.icon }}</mat-icon>
            <div class="status-pulse" *ngIf="status === 'open'"></div>
          </div>
          
          <span class="status-label">{{ config.label }}</span>
          
          <!-- Дополнительные индикаторы -->
          <div class="status-indicators" *ngIf="showIndicators">
            <div class="indicator overdue" 
                 *ngIf="isOverdue && status === 'open'"
                 matTooltip="Просрочена">
              <mat-icon>warning</mat-icon>
            </div>
            
            <div class="indicator high-value" 
                 *ngIf="isHighValue"
                 matTooltip="Крупная сделка">
              <mat-icon>star</mat-icon>
            </div>
            
            <div class="indicator hot" 
                 *ngIf="isHot"
                 matTooltip="Горячая сделка">
              <mat-icon>local_fire_department</mat-icon>
            </div>
          </div>
        </div>
      </mat-chip>
    </div>
  `,
  styles: [`
    :host ::ng-deep .mat-mdc-standard-chip:not(.mdc-evolution-chip--disabled) .mdc-evolution-chip__action--primary::before {
      opacity: 0 !important;
    }

    .deal-status-container {
      display: inline-block;
    }

    .status-chip {
      position: relative;
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid ;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: default;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      }
    }

    .status-content {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .status-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      z-index: 2;
    }

    .status-pulse {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.3;
      transform: translate(-50%, -50%);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% {
        transform: translate(-50%, -50%) scale(0.8);
        opacity: 0.5;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0.2;
      }
      100% {
        transform: translate(-50%, -50%) scale(0.8);
        opacity: 0.5;
      }
    }

    .status-label {
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .status-indicators {
      display: flex;
      gap: 4px;
      margin-left: 4px;
    }

    .indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      
      mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
      
      &.overdue {
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
      }
      
      &.high-value {
        background: #fff3e0;
        color: #f57c00;
        border: 1px solid #ffcc02;
      }
      
      &.hot {
        background: #ffebee;
        color: #d32f2f;
        border: 1px solid #ffcdd2;
      }
    }

    /* Статус: Открыта */
    .status-open {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      border-color: #2196f3;
      color: #1565c0;
      
      .status-icon {
        color: #1976d2;
      }
    }

    /* Статус: Выиграна */
    .status-won {
      background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
      border-color: #4caf50;
      color: #2e7d32;
      
      .status-icon {
        color: #388e3c;
      }
      
      &::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, #4caf50, #66bb6a, #4caf50);
        border-radius: 22px;
        z-index: -1;
        opacity: 0.3;
        animation: shimmer 3s infinite;
      }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    /* Статус: Проиграна */
    .status-lost {
      background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
      border-color: #f44336;
      color: #c62828;
      
      .status-icon {
        color: #d32f2f;
      }
    }

    /* Размеры */
    .status-chip.size-small {
      /* Even more compact small variant for tight table rows */
      min-height: 16px;
  padding: 0 4px;
      font-size: 10px;
      border-radius: 12px;
      box-shadow: none;
      cursor: default;

      /* Remove hover effects for compact chips */
      &:hover {
        transform: none;
        box-shadow: none;
      }

      .status-content {
        gap: 4px;
      }

      .status-label {
        /* keep label but more compact */
        font-size: 10px;
        line-height: 12px;
      }

      .status-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }

      .status-pulse {
        width: 12px;
        height: 12px;
      }

      /* Indicators smaller and tighter */
      .status-indicators .indicator {
        width: 12px;
        height: 12px;
        margin-left: 1px;

        mat-icon {
          font-size: 10px;
          width: 10px;
          height: 10px;
        }
      }
    }

    .status-chip.size-large {
      min-height: 44px;
      padding: 12px 20px;
      font-size: 16px;
      
      .status-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      
      .status-pulse {
        width: 28px;
        height: 28px;
      }
    }

    /* Темная тема */
    :host-context(.dark) {
      .status-open {
        background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
        border-color: #3f51b5;
        color: #bbdefb;
      }
      
      .status-won {
        background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
        border-color: #4caf50;
        color: #c8e6c9;
      }
      
      .status-lost {
        background: linear-gradient(135deg, #b71c1c 0%, #d32f2f 100%);
        border-color: #f44336;
        color: #ffcdd2;
      }
      
      .indicator {
        &.overdue {
          background: rgba(255, 193, 7, 0.2);
          color: #ffc107;
          border-color: #ff8f00;
        }
        
        &.high-value {
          background: rgba(255, 152, 0, 0.2);
          color: #ff9800;
          border-color: #f57c00;
        }
        
        &.hot {
          background: rgba(244, 67, 54, 0.2);
          color: #f44336;
          border-color: #d32f2f;
        }
      }
    }

    /* Мобильная адаптация */
    @media (max-width: 768px) {
      .status-chip {
        min-height: 32px;
        padding: 6px 12px;
        font-size: 13px;
      }
      
      .status-indicators {
        gap: 2px;
        
        .indicator {
          width: 18px;
          height: 18px;
          
          mat-icon {
            font-size: 12px;
            width: 12px;
            height: 12px;
          }
        }
      }
    }
  `]
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