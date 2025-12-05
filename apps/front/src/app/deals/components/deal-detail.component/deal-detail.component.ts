import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DealsService } from '../../../pipeline/deals.service';
import { PipelineService } from '../../../pipeline/pipeline.service';
import { UsersService, User } from '../../../users/users.service';
import { Deal } from '../../../pipeline/dtos';
import { DealFormComponent } from '../deal-form.component/deal-form.component';
import { DealStatusComponent } from '../../../shared/components';
import { DealActionsComponent } from '../deal-actions/deal-actions.component';
import { DealHistoryComponent } from '../deal-history.component';
import { DealHistoryStatsComponent } from '../deal-history-stats.component';
import { CommentsComponent } from '../../../shared/components/comments/comments.component';
import { CommentEntityType } from '../../../shared/interfaces/comment.interface';
import { AssignUserDialogComponent } from '../assign-user-dialog.component';
import { TaskListWidgetComponent } from '../../../tasks/components/task-list-widget.component';
import {
  getCurrencySymbol,
  getCurrencyName,
  translateMetadataKey,
} from '../../../shared/utils';
import { ConfirmActionDialogComponent } from '../../../shared/dialogs/confirm-action-dialog.component';

@Component({
  selector: 'app-deal-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    DealStatusComponent,
    DealActionsComponent,
    ConfirmActionDialogComponent,
    DealHistoryComponent,
    DealHistoryStatsComponent,
    CommentsComponent,
    TaskListWidgetComponent,
  ],
  templateUrl: `./deal-detail.component.html`,
  styleUrls: [`./deal-detail.component.scss`],
})
export class DealDetailComponent implements OnInit {
  // Public properties
  deal: Deal | null = null;
  users: User[] = [];
  assignedUserName = '';
  isLoading = false;
  error: string | null = null;

  // Для компонента комментариев
  readonly CommentEntityType = CommentEntityType;

  // Private services
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dealsService = inject(DealsService);
  private readonly usersService = inject(UsersService);
  private readonly pipelineService = inject(PipelineService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  ngOnInit() {
    this.loadUsers();
    const dealId = this.route.snapshot.paramMap.get('id');
    if (dealId) {
      this.loadDeal(dealId);
    } else {
      this.error = 'ID сделки не указан';
    }
  }

  loadUsers() {
    this.usersService.getAllManagers().subscribe({
      next: (users) => {
        this.users = users;
        this.updateAssignedUserName();
      },
      error: (error) => {
        console.error('Ошибка загрузки пользователей:', error);
      },
    });
  }

  updateAssignedUserName() {
    if (this.deal?.assignedTo) {
      // Преобразуем assignedTo в строку для сравнения
      const assignedToStr = String(this.deal.assignedTo);
      const user = this.users.find((u) => u.id === assignedToStr);
      if (user) {
        this.assignedUserName = user.name;
      } else {
        // Если пользователь не найден в локальном списке, показываем ID
        console.warn(
          'User not found for assignedTo:',
          assignedToStr,
          'Available users:',
          this.users.map((u) => u.id)
        );
        this.assignedUserName = `ID: ${assignedToStr}`;
      }
    } else {
      this.assignedUserName = '';
    }
  }

  loadDeal(id: string) {
    this.isLoading = true;
    this.error = null;

    this.dealsService.getDealById(id).subscribe({
      next: (deal: Deal) => {
        this.deal = deal;
        // If backend returned only stageId (string) but not populated stage object,
        // try to fetch the stage by id so the template can render stage.name.
        if (this.deal && !this.deal.stage && (this.deal as any).stageId) {
          const sid = (this.deal as any).stageId;
          this.pipelineService.getStageById(sid).subscribe({
            next: (s) => {
              if (s) {
                // assign as Stage-like object to deal.stage
                (this.deal as any).stage = s;
              }
            },
            error: (err) => {
              console.warn('Failed to load stage for deal', sid, err);
            },
          });
        }
        this.updateAssignedUserName();
        this.isLoading = false;
      },
      error: (error: unknown) => {
        console.error('Ошибка загрузки сделки:', error);
        this.error = 'Не удалось загрузить сделку';
        this.isLoading = false;
      },
    });
  }

  goBack() {
    this.router.navigate(['/deals']);
  }

  editDeal() {
    if (!this.deal) return;

    const dialogRef = this.dialog.open(DealFormComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { deal: this.deal, mode: 'edit' },
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && this.deal) {
        this.loadDeal(this.deal.id);
        this.snackBar.open('Сделка успешно обновлена', 'Закрыть', {
          duration: 3000,
        });
      }
    });
  }

  markAsWon() {
    if (!this.deal) return;
    const dialogRef = this.dialog.open(ConfirmActionDialogComponent, {
      width: '520px',
      data: {
        title: 'Подтвердите действие',
        message: `Отметить сделку "${this.deal.title}" как выигранной?`,
        confirmText: 'Подтвердить',
        cancelText: 'Отмена',
        confirmColor: 'primary',
        showInput: false,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (!result || !result.confirmed) return;

      // Call backend to mark deal as won
      this.dealsService.winDeal(this.deal!.id).subscribe({
        next: (updated) => {
          this.deal = updated;
          this.updateAssignedUserName();
          this.snackBar.open('Сделка отмечена как выигранная', 'Закрыть', {
            duration: 3000,
          });
        },
        error: (err) => {
          console.error('Ошибка при пометке сделки как выигранной:', err);
          this.snackBar.open(
            'Не удалось отметить сделку как выигранную',
            'Закрыть',
            { duration: 3000 }
          );
        },
      });
    });
  }

  isOverdue(): boolean {
    if (!this.deal) return false;

    const expectedDate = new Date(this.deal.expectedCloseDate);
    const today = new Date();
    return expectedDate < today && this.deal.status === 'open';
  }

  hasMetadata(): boolean {
    return Boolean(this.deal?.meta && Object.keys(this.deal.meta).length > 0);
  }

  getMetadataItems(): { key: string; value: string }[] {
    if (!this.deal?.meta) return [];

    return Object.entries(this.deal.meta).map(([key, value]) => ({
      key: translateMetadataKey(key),
      value: String(value),
    }));
  }

  getCurrencySymbol(currency: string): string {
    return getCurrencySymbol(currency);
  }

  getCurrencyName(currency: string): string {
    return getCurrencyName(currency);
  }

  goToLead(leadId: number): void {
    if (leadId) {
      this.router.navigate(['/leads/view', leadId]);
    }
  }

  changeAssignee(): void {
    if (!this.deal) return;

    const dialogRef = this.dialog.open(AssignUserDialogComponent, {
      width: '500px',
      data: {
        deal: this.deal,
        currentUsers: this.users,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.userId) {
        this.assignDeal(result.userId, result.user);
      }
    });
  }

  private assignDeal(userId: string, user?: User): void {
    if (!this.deal) return;

    console.log('assignDeal called with userId:', userId, 'user:', user);

    this.dealsService.assignDeal(this.deal.id, userId).subscribe({
      next: (updatedDeal) => {
        console.log('assignDeal response:', updatedDeal);
        console.log(
          'updatedDeal.assignedTo:',
          updatedDeal.assignedTo,
          'type:',
          typeof updatedDeal.assignedTo
        );

        // Принудительно устанавливаем имя из переданного user объекта
        if (user) {
          this.assignedUserName = user.name;
          console.log(
            'Set assignedUserName from user object:',
            this.assignedUserName
          );
        }

        // Перезагружаем сделку полностью для получения актуальных данных
        this.loadDeal(this.deal.id);

        this.snackBar.open(
          `Ответственный успешно изменен на ${user?.name || userId}`,
          'Закрыть',
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('Ошибка при назначении ответственного:', error);
        this.snackBar.open('Ошибка при назначении ответственного', 'Закрыть', {
          duration: 3000,
        });
      },
    });
  }
}
