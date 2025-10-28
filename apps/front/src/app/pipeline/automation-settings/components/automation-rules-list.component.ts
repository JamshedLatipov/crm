import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AutomationRule } from '../../dtos';

@Component({
  selector: 'app-automation-rules-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  template: `
    <div class="rules-list">
      <div class="section-header">
        <h3>Правила автоматизации</h3>
        <button mat-raised-button color="primary" (click)="createNewRule.emit()">
          <mat-icon>add</mat-icon>
          Новое правило
        </button>
      </div>

      <div class="rules-container" *ngIf="!isLoading(); else loading">
        <mat-card
          *ngFor="let rule of rules()"
          class="rule-card"
          [class.active]="selectedRule()?.id === rule.id"
          (click)="selectRule.emit(rule)"
        >
          <mat-card-content>
            <div class="rule-header">
              <div class="rule-info">
                <h4>{{ rule.name }}</h4>
                <p>{{ rule.description }}</p>
              </div>
              <mat-slide-toggle
                [checked]="rule.isActive"
                (click)="$event.stopPropagation()"
                (change)="toggleRule.emit(rule)"
              ></mat-slide-toggle>
            </div>

            <div class="rule-details">
              <div class="trigger-info">
                <mat-icon>flash_on</mat-icon>
                <span>{{ getTriggerLabel(rule.trigger) }}</span>
              </div>
              <div class="actions-info">
                <mat-icon>play_arrow</mat-icon>
                <span>{{ getActionsCount(rule.actions) }} действий</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <div *ngIf="rules().length === 0" class="no-rules">
          <mat-icon>info</mat-icon>
          <p>Нет правил автоматизации</p>
          <p class="subtitle">Создайте первое правило для автоматической обработки сделок</p>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading">
          <mat-icon>hourglass_empty</mat-icon>
          <p>Загрузка правил...</p>
        </div>
      </ng-template>
    </div>
  `,
  styleUrls: ['./automation-rules-list.component.scss']
})
export class AutomationRulesListComponent {
  // Inputs
  rules = input<AutomationRule[]>([]);
  isLoading = input(false);
  selectedRule = input<AutomationRule | null>(null);

  // Outputs
  selectRule = output<AutomationRule>();
  toggleRule = output<AutomationRule>();
  createNewRule = output<void>();

  private triggerTypes = [
    { value: 'DEAL_CREATED', label: 'Сделка создана' },
    { value: 'DEAL_UPDATED', label: 'Сделка обновлена' },
    { value: 'DEAL_STAGE_CHANGED', label: 'Этап изменен' },
    { value: 'DEAL_AMOUNT_CHANGED', label: 'Сумма изменена' },
    { value: 'DEAL_STATUS_CHANGED', label: 'Статус изменен' },
    { value: 'DEAL_ASSIGNED', label: 'Сделка назначена' },
    { value: 'DEAL_DUE_DATE_APPROACHING', label: 'Дедлайн приближается' },
    { value: 'DEAL_OVERDUE', label: 'Сделка просрочена' },
    { value: 'LEAD_CREATED', label: 'Лид создан' },
    { value: 'LEAD_STATUS_CHANGED', label: 'Статус лида изменен' },
    { value: 'LEAD_ASSIGNED', label: 'Лид назначен' },
    { value: 'TIME_BASED', label: 'По времени' }
  ];

  getTriggerLabel(trigger: string): string {
    const triggerType = this.triggerTypes.find(t => t.value === trigger);
    return triggerType?.label || trigger;
  }

  getActionsCount(actions: any[]): number {
    return actions?.length || 0;
  }
}