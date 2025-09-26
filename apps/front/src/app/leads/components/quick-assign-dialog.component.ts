import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { LeadService } from '../services/lead.service';
import { Lead } from '../models/lead.model';
import { Manager, UserService } from '../../shared/services/user.service';

interface QuickAssignData {
  lead: Lead;
}

@Component({
  selector: 'app-quick-assign-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="quick-assign-dialog">
      <h2 mat-dialog-title>
        <mat-icon>person_add</mat-icon>
        Быстрое назначение
      </h2>

      <mat-dialog-content>
        <p class="lead-info">
          Назначить ответственного для лида: <strong>{{ data.lead.name }}</strong>
        </p>

        <mat-form-field class="full-width" appearance="outline">
          <mat-label>Выберите менеджера</mat-label>
          <mat-select [(ngModel)]="selectedManagerId" [disabled]="loading">
            <mat-option value="">Снять назначение</mat-option>
            <mat-option 
              *ngFor="let manager of availableManagers" 
              [value]="manager.id"
              [disabled]="!manager.isAvailableForAssignment"
            >
              {{ manager.fullName }} 
              <span class="workload-info">({{ manager.currentLeadsCount }}/{{ manager.maxLeadsCapacity }} лидов)</span>
            </mat-option>
          </mat-select>
          <mat-icon matSuffix>person</mat-icon>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions>
        <button mat-button (click)="close()">Отмена</button>
        <button 
          mat-raised-button 
          color="primary" 
          (click)="assign()"
          [disabled]="loading"
        >
          <mat-icon *ngIf="loading">hourglass_empty</mat-icon>
          <span *ngIf="!loading">Назначить</span>
          <span *ngIf="loading">Назначение...</span>
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .quick-assign-dialog h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }

    .lead-info {
      margin-bottom: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .full-width {
      width: 100%;
    }

    .workload-info {
      color: #666;
      font-size: 0.875rem;
    }

    mat-dialog-actions {
      justify-content: flex-end;
      gap: 8px;
    }
  `]
})
export class QuickAssignDialogComponent {
  private readonly leadService = inject(LeadService);
  private readonly userService = inject(UserService);
  private readonly dialogRef = inject(MatDialogRef<QuickAssignDialogComponent>);
  readonly data = inject<QuickAssignData>(MAT_DIALOG_DATA);

  selectedManagerId: string = this.data.lead.assignedTo || '';
  loading = false;

  // Real managers data from API
  availableManagers: Manager[] = [];

  constructor() {
    this.loadManagers();
  }

  private loadManagers(): void {
    this.loading = true;
    this.userService.getManagers(true).subscribe({
      next: (managers) => {
        this.availableManagers = managers;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading managers:', error);
        this.loading = false;
      }
    });
  }

  assign(): void {
    this.loading = true;

    if (this.selectedManagerId) {
      // Назначить менеджера
      this.leadService.assignLead(this.data.lead.id, this.selectedManagerId).subscribe({
        next: (updatedLead) => {
          this.dialogRef.close(updatedLead);
        },
        error: (error) => {
          console.error('Error assigning lead:', error);
          this.loading = false;
        }
      });
    } else {
      // Снять назначение (если такая функция есть в API)
      // Пока просто закрываем диалог
      this.dialogRef.close();
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
