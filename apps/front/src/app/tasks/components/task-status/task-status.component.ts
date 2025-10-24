import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue';

export interface TaskStatusConfig {
  label: string;
  icon: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

@Component({
  selector: 'app-task-status',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatChipsModule, MatTooltipModule],
  template: `
    <div class="task-status-container">
      <mat-chip 
        [class]="'status-chip status-' + status + ' size-' + size"
        [style.background-color]="config.backgroundColor"
        [style.border-color]="config.borderColor"
        [style.color]="config.textColor">
        
        <div class="status-content">
          <div class="status-icon-wrapper">
            <mat-icon class="status-icon">{{ config.icon }}</mat-icon>
            <div class="status-pulse" *ngIf="status === 'in_progress'"></div>
          </div>
          
          <span class="status-label">{{ config.label }}</span>
          
          <!-- Дополнительный индикатор для просроченных -->
          <div class="status-indicators" *ngIf="showIndicators && status === 'overdue'">
            <div class="indicator overdue" 
                 matTooltip="Просрочено">
              <mat-icon>warning</mat-icon>
            </div>
          </div>
        </div>
      </mat-chip>
    </div>
  `,
  styles: [`
    .task-status-container {
      display: inline-flex;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      min-height: 36px;
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid;
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
        opacity: 0;
      }
      100% {
        transform: translate(-50%, -50%) scale(0.8);
        opacity: 0;
      }
    }

    .status-label {
      font-size: 14px;
      font-weight: 600;
      line-height: 1;
    }

    .status-indicators {
      display: flex;
      align-items: center;
      gap: 4px;
      
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
      }
      
      .indicator.overdue {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
      }
    }

    /* Статус: В ожидании (Pending) */
    .status-pending {
      background: #fff7ed;
      border-color: #f59e0b;
      color: #b45309;
    }

    /* Статус: В работе (In Progress) */
    .status-in_progress {
      background: #e8f0ff;
      border-color: #3b82f6;
      color: #2563eb;
    }

    /* Статус: Завершено (Done) */
    .status-done {
      background: #ecfdf5;
      border-color: #10b981;
      color: #047857;
    }

    /* Статус: Просрочено (Overdue) */
    .status-overdue {
      background: #fff1f2;
      border-color: #ef4444;
      color: #b91c1c;
      animation: pulse-border 2s ease-in-out infinite;
    }

    @keyframes pulse-border {
      0%, 100% {
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
      }
      50% {
        box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
      }
    }

    /* Размеры */
    .status-chip.size-small {
      min-height: 28px;
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 14px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

      &:hover {
        transform: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }

      .status-content {
        gap: 6px;
      }

      .status-label {
        font-size: 12px;
      }

      .status-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .status-pulse {
        width: 20px;
        height: 20px;
      }

      .status-indicators .indicator {
        width: 16px;
        height: 16px;

        mat-icon {
          font-size: 12px;
          width: 12px;
          height: 12px;
        }
      }
    }

    .status-chip.size-medium {
      min-height: 36px;
      padding: 8px 16px;
      font-size: 14px;
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
      .status-pending {
        background: #422006;
        border-color: #f59e0b;
        color: #fbbf24;
      }
      
      .status-in_progress {
        background: #1e3a8a;
        border-color: #3b82f6;
        color: #93c5fd;
      }
      
      .status-done {
        background: #14532d;
        border-color: #10b981;
        color: #6ee7b7;
      }
      
      .status-overdue {
        background: #7f1d1d;
        border-color: #ef4444;
        color: #fca5a5;
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
export class TaskStatusComponent {
  @Input() status: TaskStatus = 'pending';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showIndicators = false;

  private readonly statusConfigs: Record<TaskStatus, TaskStatusConfig> = {
    pending: {
      label: 'В ожидании',
      icon: 'pending',
      color: '#f59e0b',
      backgroundColor: '#fff7ed',
      borderColor: '#f59e0b',
      textColor: '#b45309'
    },
    in_progress: {
      label: 'В работе',
      icon: 'play_circle',
      color: '#3b82f6',
      backgroundColor: '#e8f0ff',
      borderColor: '#3b82f6',
      textColor: '#2563eb'
    },
    done: {
      label: 'Завершено',
      icon: 'check_circle',
      color: '#10b981',
      backgroundColor: '#ecfdf5',
      borderColor: '#10b981',
      textColor: '#047857'
    },
    overdue: {
      label: 'Просрочено',
      icon: 'warning',
      color: '#ef4444',
      backgroundColor: '#fff1f2',
      borderColor: '#ef4444',
      textColor: '#b91c1c'
    }
  };

  get config(): TaskStatusConfig {
    return this.statusConfigs[this.status] || this.statusConfigs.pending;
  }
}
