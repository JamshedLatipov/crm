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
import { DealHistoryComponent } from '../deal-history.component';
import { DealHistoryStatsComponent } from '../deal-history-stats.component';
import { CommentsComponent } from '../../../shared/components/comments/comments.component';
import { CommentEntityType } from '../../../shared/interfaces/comment.interface';
import { AssignUserDialogComponent } from '../assign-user-dialog.component';
import { TaskListWidgetComponent } from '../../../tasks/task-list-widget.component';

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
    DealHistoryComponent,
    DealHistoryStatsComponent,
    CommentsComponent,
    TaskListWidgetComponent
  ],
  templateUrl: `./deal-detail.component.html`,
  styleUrls: [`./deal-detail.component.scss`]
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
      }
    });
  }

  updateAssignedUserName() {
    if (this.deal?.assignedTo) {
      const user = this.users.find(u => u.id === this.deal?.assignedTo);
      this.assignedUserName = user?.name || `ID: ${this.deal.assignedTo}`;
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
            }
          });
        }
        this.updateAssignedUserName();
        this.isLoading = false;
      },
      error: (error: unknown) => {
        console.error('Ошибка загрузки сделки:', error);
        this.error = 'Не удалось загрузить сделку';
        this.isLoading = false;
      }
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
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.deal) {
        this.loadDeal(this.deal.id);
        this.snackBar.open('Сделка успешно обновлена', 'Закрыть', { duration: 3000 });
      }
    });
  }

  markAsWon() {
    if (!this.deal) return;

    // TODO: Реализовать изменение статуса через API
    this.snackBar.open('Функция пока не реализована', 'Закрыть', { duration: 3000 });
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
      key: this.translateMetadataKey(key),
      value: String(value)
    }));
  }

  translateMetadataKey(key: string): string {
    const translations: Record<string, string> = {
      'source': 'Источник',
      'campaign': 'Кампания',
      'utm_source': 'UTM источник',
      'utm_medium': 'UTM канал',
      'utm_campaign': 'UTM кампания',
      'utm_content': 'UTM контент',
      'utm_term': 'UTM термин',
      'referrer': 'Реферер',
      'landing_page': 'Посадочная страница',
      'lead_score': 'Оценка лида',
      'conversion_date': 'Дата конверсии',
      'original_lead_id': 'ID исходного лида',
      'sales_rep': 'Менеджер продаж',
      'region': 'Регион',
      'industry': 'Отрасль',
      'company_size': 'Размер компании',
      'budget': 'Бюджет',
      'decision_maker': 'Лицо, принимающее решения',
      'competitors': 'Конкуренты',
      'pain_points': 'Болевые точки',
      'demo_date': 'Дата демонстрации',
      'proposal_sent_date': 'Дата отправки предложения',
      'contract_type': 'Тип контракта',
      'payment_terms': 'Условия оплаты',
      'delivery_date': 'Дата поставки',
      'custom_field_1': 'Дополнительное поле 1',
      'custom_field_2': 'Дополнительное поле 2',
      'custom_field_3': 'Дополнительное поле 3',
      'notes': 'Заметки',
      'tags': 'Теги'
    };

    return translations[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
  }

  getCurrencySymbol(currency: string): string {
    switch (currency) {
      case 'RUB':
        return '₽';
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      default:
        return currency;
    }
  }

  getCurrencyName(currency: string): string {
    switch (currency) {
      case 'RUB':
        return 'Рубль';
      case 'USD':
        return 'Доллар';
      case 'EUR':
        return 'Евро';
      default:
        return currency;
    }
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
        currentUsers: this.users
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.userId) {
        this.assignDeal(result.userId, result.user);
      }
    });
  }

  private assignDeal(userId: string, user?: User): void {
    if (!this.deal) return;

    this.dealsService.assignDeal(this.deal.id, userId).subscribe({
      next: (updatedDeal) => {
        this.deal = updatedDeal;
        this.updateAssignedUserName();
        this.snackBar.open(
          `Ответственный успешно изменен на ${user?.name || userId}`, 
          'Закрыть', 
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('Ошибка при назначении ответственного:', error);
        this.snackBar.open(
          'Ошибка при назначении ответственного', 
          'Закрыть', 
          { duration: 3000 }
        );
      }
    });
  }
}