import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Deal } from '../../pipeline/dtos';

export interface StatusChangeData {
  deal: Deal;
  newStatus: 'won' | 'lost';
}

export interface StatusChangeResult {
  confirmed: boolean;
  notes?: string;
}

@Component({
  selector: 'app-status-change-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <div class="status-change-dialog">
      <div class="dialog-header">
        <div class="header-icon" [class]="getIconClass()">
          <mat-icon>{{ getIcon() }}</mat-icon>
        </div>
        <div class="header-content">
          <h2 mat-dialog-title>{{ getTitle() }}</h2>
          <p class="deal-title">{{ data.deal.title }}</p>
        </div>
      </div>

      <div mat-dialog-content class="dialog-content">
        <p class="confirmation-text">{{ getConfirmationText() }}</p>
        
        <mat-form-field appearance="outline" class="notes-field">
          <mat-label>{{ getNotesLabel() }}</mat-label>
          <textarea matInput 
                    [(ngModel)]="notes" 
                    [placeholder]="getNotesPlaceholder()"
                    rows="3"
                    maxlength="500"></textarea>
          <mat-hint>Необязательно (макс. 500 символов)</mat-hint>
        </mat-form-field>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="cancel()">Отмена</button>
        <button mat-raised-button 
                [color]="getButtonColor()" 
                (click)="confirm()"
                class="confirm-button">
          <mat-icon>{{ getIcon() }}</mat-icon>
          {{ getConfirmButtonText() }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .status-change-dialog {
      width: 100%;
      max-width: 500px;
    }

    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
      
      .header-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        
        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
          color: white;
        }
        
        &.won {
          background: var(--success-color, #16a34a);
        }
        
        &.lost {
          background: var(--warn-color, #dc2626);
        }
      }
      
      .header-content {
        flex: 1;
        
        h2 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }
        
        .deal-title {
          margin: 0;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
        }
      }
    }

    .dialog-content {
      .confirmation-text {
        margin: 0 0 20px 0;
        line-height: 1.5;
        color: #374151;
      }
      
      .notes-field {
        width: 100%;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding: 0;
      
      .confirm-button {
        min-width: 140px;
        
        mat-icon {
          margin-right: 8px;
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    /* Темная тема */
    :host-context(.dark) {
      .dialog-content .confirmation-text {
        color: #d1d5db;
      }
      
      .header-content .deal-title {
        color: #9ca3af;
      }
    }
  `]
})
export class StatusChangeDialogComponent {
  notes = '';
  
  private readonly dialogRef = inject(MatDialogRef<StatusChangeDialogComponent>);
  public readonly data = inject<StatusChangeData>(MAT_DIALOG_DATA);

  getTitle(): string {
    return this.data.newStatus === 'won' ? 'Отметить сделку выигранной' : 'Отметить сделку проигранной';
  }

  getIcon(): string {
    return this.data.newStatus === 'won' ? 'check_circle' : 'cancel';
  }

  getIconClass(): string {
    return this.data.newStatus;
  }

  getConfirmationText(): string {
    const statusText = this.data.newStatus === 'won' ? 'выигранной' : 'проигранной';
    return `Вы уверены, что хотите отметить эту сделку как ${statusText}? Это действие изменит статус сделки.`;
  }

  getNotesLabel(): string {
    return this.data.newStatus === 'won' ? 'Комментарий к победе' : 'Причина проигрыша';
  }

  getNotesPlaceholder(): string {
    return this.data.newStatus === 'won' 
      ? 'Опишите как была выиграна сделка...' 
      : 'Укажите причину проигрыша...';
  }

  getButtonColor(): string {
    return this.data.newStatus === 'won' ? 'primary' : 'warn';
  }

  getConfirmButtonText(): string {
    return this.data.newStatus === 'won' ? 'Отметить выигранной' : 'Отметить проигранной';
  }

  cancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  confirm(): void {
    this.dialogRef.close({ 
      confirmed: true, 
      notes: this.notes.trim() || undefined 
    });
  }
}