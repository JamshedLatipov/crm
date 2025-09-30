import { Component, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Deal } from '../../pipeline/dtos';
import { UsersService, User } from '../../users/users.service';
import { AssignUserDialogComponent } from './assign-user-dialog.component';
import { DealStatusComponent } from '../../shared/components';

@Component({
  selector: 'app-deal-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule,
    DealStatusComponent
  ],
  template: `
    <mat-card class="deal-card" [class.urgent]="isUrgent()">
      <mat-card-header>
        <div class="deal-header">
          <div class="deal-title">
            <h3 (click)="onView()" 
                (keyup.enter)="onView()" 
                (keyup.space)="onView()"
                tabindex="0"
                role="button"
                class="clickable"
                [attr.aria-label]="'Просмотреть сделку ' + deal.title">{{ deal.title }}</h3>
            <div class="deal-status">
              <app-deal-status 
                [status]="deal.status"
                [showIndicators]="true"
                [isOverdue]="isOverdue()"
                [isHighValue]="(deal.amount || 0) > 50000"
                size="small">
              </app-deal-status>
            </div>
          </div>
          <div class="deal-actions">
            <button mat-icon-button [matMenuTriggerFor]="dealMenu" aria-label="Действия">
              <mat-icon>more_vert</mat-icon>
            </button>
          </div>
        </div>
      </mat-card-header>

      <mat-card-content>
        <div class="deal-info">
          <!-- Сумма и валюта -->
          <div class="deal-amount">
            <mat-icon>monetization_on</mat-icon>
            <span class="amount">{{ (deal.amount || 0) | currency:deal.currency:'symbol':'1.0-0' }}</span>
            <span class="probability">({{ deal.probability }}%)</span>
          </div>

          <!-- Контакт -->
          <div class="deal-contact" *ngIf="deal.contact">
            <mat-icon>person</mat-icon>
            <span>{{ deal.contact.name }}</span>
            <span class="contact-details" *ngIf="deal.contact.email">{{ deal.contact.email }}</span>
          </div>

          <!-- Компания -->
          <div class="deal-company" *ngIf="deal.company">
            <mat-icon>business</mat-icon>
            <span>{{ deal.company.name }}</span>
          </div>

          <!-- Этап -->
          <div class="deal-stage" *ngIf="deal.stage">
            <mat-icon>flag</mat-icon>
            <span>{{ deal.stage.name }}</span>
          </div>

          <!-- Ответственный -->
          <div class="deal-assignee" *ngIf="deal.assignedTo">
            <mat-icon>account_circle</mat-icon>
            <span>{{ assignedUserName || deal.assignedTo }}</span>
          </div>

          <!-- Дата закрытия -->
          <div class="deal-date" [class.overdue]="isOverdue()">
            <mat-icon>event</mat-icon>
            <span>{{ deal.expectedCloseDate | date:'shortDate' }}</span>
            <mat-icon *ngIf="isOverdue()" matTooltip="Просрочено" class="warning-icon">warning</mat-icon>
          </div>
        </div>

        <!-- Заметки (если есть) -->
        <div class="deal-notes" *ngIf="deal.notes && deal.notes.trim()">
          <mat-icon>note</mat-icon>
          <span class="notes-text">{{ deal.notes }}</span>
        </div>
      </mat-card-content>

      <mat-card-actions>
        <button mat-button color="primary" (click)="onView()">
          <mat-icon>visibility</mat-icon>
          Просмотр
        </button>
        <button mat-button (click)="onEdit()">
          <mat-icon>edit</mat-icon>
          Редактировать
        </button>
      </mat-card-actions>

      <!-- Меню действий -->
      <mat-menu #dealMenu="matMenu">
        <button mat-menu-item (click)="onEdit()">
          <mat-icon>edit</mat-icon>
          <span>Редактировать</span>
        </button>
        
        <button mat-menu-item (click)="onView()">
          <mat-icon>visibility</mat-icon>
          <span>Подробнее</span>
        </button>
        
        <button mat-menu-item (click)="onAssignUser()">
          <mat-icon>assignment_ind</mat-icon>
          <span>Сменить ответственного</span>
        </button>
        
        <button mat-menu-item (click)="onDuplicate()">
          <mat-icon>content_copy</mat-icon>
          <span>Дублировать</span>
        </button>

        <mat-divider></mat-divider>

        <button mat-menu-item (click)="onChangeStage()" *ngIf="deal.status === 'open'">
          <mat-icon>compare_arrows</mat-icon>
          <span>Изменить этап</span>
        </button>

        <button mat-menu-item (click)="onMarkWon()" *ngIf="deal.status === 'open'">
          <mat-icon>check_circle</mat-icon>
          <span>Отметить выигранной</span>
        </button>

        <button mat-menu-item (click)="onMarkLost()" *ngIf="deal.status === 'open'">
          <mat-icon>cancel</mat-icon>
          <span>Отметить проигранной</span>
        </button>

        <mat-divider></mat-divider>

        <button mat-menu-item (click)="onDelete()" class="delete-action">
          <mat-icon>delete</mat-icon>
          <span>Удалить</span>
        </button>
      </mat-menu>
    </mat-card>
  `,
  styles: [`
    .deal-card {
      margin-bottom: 16px;
      transition: all 0.2s ease;
      border-left: 4px solid var(--status-color, #4caf50);
      
      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }
      
      &.urgent {
        border-left-color: #f44336;
      }
    }

    .deal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    }

    .deal-title {
      flex: 1;
      
      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
        
        &.clickable {
          cursor: pointer;
          
          &:hover {
            color: var(--primary-color);
          }
        }
      }
    }

    .deal-status {
      /* Стили теперь в deal-status компоненте */
    }

    .deal-info {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 16px 0;
    }

    .deal-amount,
    .deal-contact,
    .deal-company,
    .deal-stage,
    .deal-assignee,
    .deal-date {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-secondary);
      
      mat-icon {
        width: 20px;
        height: 20px;
        font-size: 20px;
        color: var(--icon-color);
      }
    }

    .deal-amount {
      .amount {
        font-weight: 600;
        font-size: 16px;
        color: var(--text-primary);
      }
      
      .probability {
        color: var(--text-secondary);
        font-size: 14px;
      }
    }

    .deal-contact {
      .contact-details {
        font-size: 12px;
        opacity: 0.7;
        margin-left: 8px;
      }
    }

    .deal-date {
      &.overdue {
        color: #f44336;
        
        .warning-icon {
          color: #f44336;
          margin-left: 4px;
        }
      }
    }

    .deal-notes {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      padding: 12px;
      background-color: var(--notes-bg);
      border-radius: 8px;
      border-left: 3px solid var(--primary-color);
      
      mat-icon {
        width: 20px;
        height: 20px;
        font-size: 20px;
        color: var(--primary-color);
        flex-shrink: 0;
      }
      
      .notes-text {
        font-size: 14px;
        line-height: 1.4;
        color: var(--text-secondary);
        word-break: break-word;
      }
    }

    .delete-action {
      color: #f44336;
      
      mat-icon {
        color: #f44336;
      }
    }

    /* Переменные для темной темы */
    :host-context(.dark) {
      --primary-color: #3b82f6;
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
      --icon-color: #6b7280;
      --notes-bg: rgba(59, 130, 246, 0.1);
    }

    /* Переменные для светлой темы */
    :host-context(.light), :host {
      --primary-color: #2563eb;
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --icon-color: #9ca3af;
      --notes-bg: rgba(37, 99, 235, 0.05);
    }

    @media (max-width: 600px) {
      .deal-header {
        flex-direction: column;
        gap: 8px;
        align-items: stretch;
      }
      
      .deal-actions {
        align-self: flex-end;
      }
    }
  `]
})
export class DealCardComponent implements OnInit, OnChanges {
  private readonly router = inject(Router);
  private readonly usersService = inject(UsersService);
  private readonly dialog = inject(MatDialog);

  users: User[] = [];
  assignedUserName = '';

  ngOnInit() {
    this.loadUsers();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['deal'] && this.users.length > 0) {
      this.updateAssignedUserName();
    }
  }

  private loadUsers() {
    this.usersService.getAllManagers().subscribe({
      next: (users) => {
        this.users = users;
        this.updateAssignedUserName();
      },
      error: (error) => {
        console.error('Ошибка загрузки пользователей:', error);
      }
    });
  }

  private updateAssignedUserName() {
    if (this.deal?.assignedTo) {
      const user = this.users.find(u => u.id === this.deal.assignedTo);
      this.assignedUserName = user?.name || `ID: ${this.deal.assignedTo}`;
    }
  }
  
  @Input() deal!: Deal;
  @Output() edit = new EventEmitter<Deal>();
  @Output() delete = new EventEmitter<Deal>();
  @Output() duplicate = new EventEmitter<Deal>();
  @Output() statusChange = new EventEmitter<{ deal: Deal; status: string }>();
  @Output() stageChange = new EventEmitter<Deal>();
  @Output() assigneeChange = new EventEmitter<{ deal: Deal; assignedTo: string; user: User }>();

  onView() {
    this.router.navigate(['/deals/view', this.deal.id]);
  }

  onEdit() {
    this.edit.emit(this.deal);
  }

  onDelete() {
    this.delete.emit(this.deal);
  }

  onDuplicate() {
    this.duplicate.emit(this.deal);
  }

  onChangeStage() {
    this.stageChange.emit(this.deal);
  }

  onMarkWon() {
    this.statusChange.emit({ deal: this.deal, status: 'won' });
  }

  onMarkLost() {
    this.statusChange.emit({ deal: this.deal, status: 'lost' });
  }

  isOverdue(): boolean {
    const expectedDate = new Date(this.deal.expectedCloseDate);
    const today = new Date();
    return expectedDate < today && this.deal.status === 'open';
  }

  isUrgent(): boolean {
    const expectedDate = new Date(this.deal.expectedCloseDate);
    const today = new Date();
    const daysDiff = Math.ceil((expectedDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysDiff <= 3 && daysDiff >= 0 && this.deal.status === 'open';
  }

  onAssignUser() {
    const dialogRef = this.dialog.open(AssignUserDialogComponent, {
      data: {
        deal: this.deal,
        currentUsers: this.users
      },
      width: '500px',
      maxHeight: '80vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.userId) {
        this.assigneeChange.emit({
          deal: this.deal,
          assignedTo: result.userId,
          user: result.user
        });
      }
    });
  }
}