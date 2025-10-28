import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AutomationRule, AutomationTrigger, AutomationAction, Stage } from '../../dtos';
import { Manager, LeadSource, LeadPriority, LeadStatus } from '../../../shared/types/common.types';
import { AutomationRuleConditionsComponent } from './automation-rule-conditions.component';
import { AutomationRuleActionsComponent } from './automation-rule-actions.component';

@Component({
  selector: 'app-automation-rule-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    AutomationRuleConditionsComponent,
    AutomationRuleActionsComponent
  ],
  template: `
    <div class="rule-editor" *ngIf="selectedRule() || isEditingNew()">
      <div class="editor-header">
        <h3>{{ selectedRule()?.id ? 'Редактирование правила' : 'Создание правила' }}</h3>
        <div class="editor-actions">
          <button mat-button (click)="cancelEdit.emit()">
            <mat-icon>cancel</mat-icon>
            Отмена
          </button>
          <button
            mat-raised-button
            color="primary"
            [disabled]="!(selectedRule() || newRule()) || !(selectedRule()?.name?.trim() || newRule().name?.trim())"
            (click)="selectedRule()?.id ? updateRule.emit(selectedRule()!) : createRule.emit(newRule())"
          >
            <mat-icon>{{ selectedRule()?.id ? 'save' : 'add' }}</mat-icon>
            {{ selectedRule()?.id ? 'Сохранить' : 'Создать' }}
          </button>
        </div>
      </div>

      <div class="rule-form">
        <!-- Основная информация -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>Основная информация</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Название правила</mat-label>
              <input matInput [(ngModel)]="(selectedRule() || newRule()).name" placeholder="Например: Автоперемещение холодных лидов">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Описание</mat-label>
              <textarea
                matInput
                [(ngModel)]="(selectedRule() || newRule()).description"
                rows="3"
                placeholder="Опишите, что делает это правило"
              ></textarea>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <!-- Триггер -->
        <mat-card class="form-section">
          <mat-card-header>
            <mat-card-title>Триггер (условие запуска)</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline">
              <mat-label>Тип триггера</mat-label>
              <mat-select [(ngModel)]="(selectedRule() || newRule()).trigger">
                <mat-option *ngFor="let type of triggerTypes" [value]="type.value">
                  {{ type.label }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <!-- Условия -->
        <mat-card class="form-section conditions-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="section-icon">filter_list</mat-icon>
              Условия (дополнительные фильтры)
            </mat-card-title>
            <div class="section-actions">
              <span class="section-hint">Нажмите + чтобы добавить условие</span>
              <button mat-icon-button color="accent" (click)="addCondition.emit()" matTooltip="Добавить условие">
                <mat-icon>add</mat-icon>
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            <div class="conditions-logic">
              <span class="logic-label">Все условия должны выполняться (И)</span>
            </div>

            <app-automation-rule-conditions
              [conditions]="(selectedRule() || newRule()).conditions"
              [stages]="stages()"
              [managers]="managers()"
              [sourcesInput]="getSourcesOptions()"
              [prioritiesInput]="getPrioritiesOptions()"
              [statusesInput]="getStatusesOptions()"
              (onConditionFieldChange)="onConditionFieldChange.emit($event)"
              (removeCondition)="removeCondition.emit($event)">
            </app-automation-rule-conditions>

            <div *ngIf="!(selectedRule() || newRule()).conditions?.length" class="no-conditions">
              <mat-icon>filter_alt_off</mat-icon>
              <div class="no-conditions-content">
                <h4>Условий нет</h4>
                <p>Правило будет применяться ко всем объектам, соответствующим триггеру.</p>
                <p class="hint">Используйте кнопку "+" выше, чтобы добавить условия фильтрации и сделать правило более точным.</p>
              </div>
            </div>

            <!-- Статистика условий -->
            <div class="conditions-summary" *ngIf="(selectedRule() || newRule()).conditions?.length > 0">
              <mat-chip-listbox>
                <mat-chip>{{ (selectedRule() || newRule()).conditions.length }} услови{{ getConditionsWord((selectedRule() || newRule()).conditions.length) }}</mat-chip>
              </mat-chip-listbox>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Действия -->
        <mat-card class="form-section actions-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="section-icon">play_arrow</mat-icon>
              Действия (автоматические операции)
            </mat-card-title>
            <div class="section-actions">
              <span class="section-hint">Нажмите + чтобы добавить действие</span>
              <button mat-icon-button color="accent" (click)="addAction.emit()" matTooltip="Добавить действие">
                <mat-icon>add</mat-icon>
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            <app-automation-rule-actions
              [actions]="(selectedRule() || newRule()).actions"
              [stages]="stages()"
              [managers]="managers()"
              (removeAction)="removeAction.emit($event)">
            </app-automation-rule-actions>
          </mat-card-content>
        </mat-card>
      </div>
    </div>

    <ng-template #createNew>
      <div class="create-placeholder">
        <mat-icon>settings</mat-icon>
        <h3>Создайте правило автоматизации</h3>
        <p>Нажмите кнопку ниже, чтобы начать настройку</p>
        <button mat-raised-button color="primary" (click)="createNewRule.emit()">
          <mat-icon>add</mat-icon>
          Создать новое правило
        </button>
        <p class="instructions">
          <strong>Как настроить правило:</strong><br>
          1. Выберите триггер (событие запуска)<br>
          2. Добавьте условия фильтрации (опционально)<br>
          3. Добавьте действия для автоматического выполнения
        </p>
      </div>
    </ng-template>
  `,
  styleUrls: ['./automation-rule-editor.component.scss']
})
export class AutomationRuleEditorComponent {
  // Inputs
  selectedRule = input<AutomationRule | null>(null);
  isEditingNew = input(false);
  stages = input<Stage[]>([]);
  managers = input<Manager[]>([]);
  leadSources = input<LeadSource[]>([]);
  leadPriorities = input<LeadPriority[]>([]);
  leadStatuses = input<LeadStatus[]>([]);
  newRule = input<Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastTriggeredAt' | 'triggerCount'>>({
    name: '',
    description: '',
    trigger: AutomationTrigger.DEAL_CREATED,
    conditions: [],
    actions: [],
    isActive: true,
    priority: 0
  });

  // Outputs
  cancelEdit = output<void>();
  createRule = output<any>();
  updateRule = output<AutomationRule>();
  addCondition = output<void>();
  removeCondition = output<number>();
  addAction = output<void>();
  removeAction = output<number>();
  onConditionFieldChange = output<{ index: number; field: string }>();
  createNewRule = output<void>();

  // Опции для форм
  triggerTypes = [
    { value: AutomationTrigger.DEAL_CREATED, label: 'Сделка создана' },
    { value: AutomationTrigger.DEAL_UPDATED, label: 'Сделка обновлена' },
    { value: AutomationTrigger.DEAL_STAGE_CHANGED, label: 'Этап изменен' },
    { value: AutomationTrigger.DEAL_AMOUNT_CHANGED, label: 'Сумма изменена' },
    { value: AutomationTrigger.DEAL_STATUS_CHANGED, label: 'Статус изменен' },
    { value: AutomationTrigger.DEAL_ASSIGNED, label: 'Сделка назначена' },
    { value: AutomationTrigger.DEAL_DUE_DATE_APPROACHING, label: 'Дедлайн приближается' },
    { value: AutomationTrigger.DEAL_OVERDUE, label: 'Сделка просрочена' },
    { value: AutomationTrigger.LEAD_CREATED, label: 'Лид создан' },
    { value: AutomationTrigger.LEAD_STATUS_CHANGED, label: 'Статус лида изменен' },
    { value: AutomationTrigger.LEAD_ASSIGNED, label: 'Лид назначен' },
    { value: AutomationTrigger.TIME_BASED, label: 'По времени' }
  ];

  actionTypes = [
    { value: AutomationAction.CHANGE_STAGE, label: 'Изменить этап' },
    { value: AutomationAction.CHANGE_STATUS, label: 'Изменить статус' },
    { value: AutomationAction.ASSIGN_TO_USER, label: 'Назначить пользователю' },
    { value: AutomationAction.SEND_NOTIFICATION, label: 'Отправить уведомление' },
    { value: AutomationAction.CREATE_TASK, label: 'Создать задачу' },
    { value: AutomationAction.UPDATE_AMOUNT, label: 'Обновить сумму' },
    { value: AutomationAction.ADD_TAGS, label: 'Добавить теги' },
    { value: AutomationAction.SEND_EMAIL, label: 'Отправить email' },
    { value: AutomationAction.SET_REMINDER, label: 'Установить напоминание' }
  ];

  notificationTypes = [
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' }
  ];

  // Вспомогательные методы для условий
  getConditionPlaceholder(field: string): string {
    switch (field) {
      case 'STAGE_EQUALS':
      case 'STAGE_NOT_EQUALS':
        return 'ID этапа';
      case 'STATUS_EQUALS':
        return 'статус';
      case 'AMOUNT_GREATER_THAN':
      case 'AMOUNT_LESS_THAN':
      case 'AMOUNT_BETWEEN':
        return 'Сумма в TJS';
      case 'ASSIGNED_TO_EQUALS':
        return 'ID менеджера';
      case 'TAGS_CONTAIN':
      case 'TAGS_NOT_CONTAIN':
        return 'тег1, тег2';
      case 'SOURCE_EQUALS':
        return 'источник';
      case 'PRIORITY_EQUALS':
        return 'приоритет';
      case 'SCORE_GREATER_THAN':
        return 'баллы';
      case 'CREATED_WITHIN_DAYS':
        return 'количество дней';
      default:
        return 'Значение';
    }
  }

  getConditionIcon(field: string): string {
    switch (field) {
      case 'STAGE_EQUALS':
      case 'STAGE_NOT_EQUALS':
        return 'timeline';
      case 'STATUS_EQUALS':
        return 'flag';
      case 'AMOUNT_GREATER_THAN':
      case 'AMOUNT_LESS_THAN':
      case 'AMOUNT_BETWEEN':
        return 'attach_money';
      case 'ASSIGNED_TO_EQUALS':
        return 'person';
      case 'TAGS_CONTAIN':
      case 'TAGS_NOT_CONTAIN':
        return 'label';
      case 'SOURCE_EQUALS':
        return 'link';
      case 'PRIORITY_EQUALS':
        return 'priority_high';
      case 'SCORE_GREATER_THAN':
        return 'star';
      case 'CREATED_WITHIN_DAYS':
        return 'schedule';
      default:
        return 'filter_list';
    }
  }

  getConditionValueLabel(field: string): string {
    switch (field) {
      case 'STAGE_EQUALS':
      case 'STAGE_NOT_EQUALS':
        return 'Этап';
      case 'STATUS_EQUALS':
        return 'Статус';
      case 'AMOUNT_GREATER_THAN':
      case 'AMOUNT_LESS_THAN':
        return 'Сумма';
      case 'AMOUNT_BETWEEN':
        return 'Диапазон суммы';
      case 'ASSIGNED_TO_EQUALS':
        return 'Менеджер';
      case 'TAGS_CONTAIN':
      case 'TAGS_NOT_CONTAIN':
        return 'Теги';
      case 'SOURCE_EQUALS':
        return 'Источник';
      case 'PRIORITY_EQUALS':
        return 'Приоритет';
      case 'SCORE_GREATER_THAN':
        return 'Минимальный скор';
      case 'CREATED_WITHIN_DAYS':
        return 'Дни';
      default:
        return 'Значение';
    }
  }

  getConditionHint(field: string): string {
    switch (field) {
      case 'STAGE_EQUALS':
        return 'Выберите ID этапа из списка';
      case 'AMOUNT_GREATER_THAN':
        return 'Сделки с суммой больше указанной';
      case 'AMOUNT_LESS_THAN':
        return 'Сделки с суммой меньше указанной';
      case 'TAGS_CONTAIN':
        return 'Через запятую, без пробелов';
      case 'ASSIGNED_TO_EQUALS':
        return 'ID пользователя-менеджера';
      case 'CREATED_WITHIN_DAYS':
        return 'Количество дней с момента создания';
      default:
        return '';
    }
  }

  getConditionDescription(field: string): string {
    switch (field) {
      case 'STAGE_EQUALS':
        return 'Применяется только к сделкам на выбранном этапе';
      case 'AMOUNT_GREATER_THAN':
        return 'Фильтрует сделки по минимальной сумме';
      case 'AMOUNT_LESS_THAN':
        return 'Фильтрует сделки по максимальной сумме';
      case 'TAGS_CONTAIN':
        return 'Сделка должна содержать хотя бы один из указанных тегов';
      case 'ASSIGNED_TO_EQUALS':
        return 'Только сделки назначенные конкретному менеджеру';
      case 'CREATED_WITHIN_DAYS':
        return 'Сделки созданные не более указанного количества дней назад';
      default:
        return 'Дополнительный фильтр для правила';
    }
  }

  isBetweenCondition(field: string): boolean {
    return field === 'AMOUNT_BETWEEN';
  }

  getConditionsWord(count: number): string {
    if (count === 1) return 'е';
    if (count >= 2 && count <= 4) return 'я';
    return 'й';
  }

  // Вспомогательные методы для действий
  getActionIcon(type: string): string {
    switch (type) {
      case AutomationAction.CHANGE_STAGE:
        return 'timeline';
      case AutomationAction.CHANGE_STATUS:
        return 'flag';
      case AutomationAction.ASSIGN_TO_USER:
        return 'person_add';
      case AutomationAction.SEND_NOTIFICATION:
        return 'notifications';
      case AutomationAction.CREATE_TASK:
        return 'task';
      case AutomationAction.UPDATE_AMOUNT:
        return 'attach_money';
      case AutomationAction.ADD_TAGS:
        return 'label';
      case AutomationAction.SEND_EMAIL:
        return 'email';
      case AutomationAction.SET_REMINDER:
        return 'alarm';
      default:
        return 'play_arrow';
    }
  }

  getActionDescription(type: string): string {
    switch (type) {
      case AutomationAction.CHANGE_STAGE:
        return 'Автоматически перемещает сделку на выбранный этап воронки';
      case AutomationAction.CHANGE_STATUS:
        return 'Изменяет статус сделки на указанный';
      case AutomationAction.ASSIGN_TO_USER:
        return 'Назначает сделку конкретному менеджеру';
      case AutomationAction.SEND_NOTIFICATION:
        return 'Отправляет уведомление по email или SMS';
      case AutomationAction.CREATE_TASK:
        return 'Создает новую задачу для менеджера';
      case AutomationAction.UPDATE_AMOUNT:
        return 'Изменяет сумму сделки на указанную';
      case AutomationAction.ADD_TAGS:
        return 'Добавляет теги к сделке для категоризации';
      case AutomationAction.SEND_EMAIL:
        return 'Отправляет персонализированное email-сообщение';
      case AutomationAction.SET_REMINDER:
        return 'Устанавливает напоминание для менеджера';
      default:
        return 'Выполняет автоматическое действие';
    }
  }

  getActionHint(type: string): string {
    switch (type) {
      case AutomationAction.CHANGE_STAGE:
        return 'Выберите этап из списка доступных';
      case AutomationAction.ASSIGN_TO_USER:
        return 'Укажите ID пользователя-менеджера';
      case AutomationAction.SEND_NOTIFICATION:
        return 'Настройте тип и текст уведомления';
      case AutomationAction.CREATE_TASK:
        return 'Заполните название, описание и дедлайн';
      case AutomationAction.UPDATE_AMOUNT:
        return 'Новая сумма в TJS';
      case AutomationAction.ADD_TAGS:
        return 'Теги через запятую, без пробелов';
      case AutomationAction.SEND_EMAIL:
        return 'Укажите получателей и текст письма';
      case AutomationAction.SET_REMINDER:
        return 'Время и текст напоминания';
      default:
        return '';
    }
  }

  getActionsWord(count: number): string {
    if (count === 1) return 'е';
    if (count >= 2 && count <= 4) return 'я';
    return 'й';
  }

  // Методы для получения опций справочников
  getSourcesOptions() {
    return Object.values(LeadSource).map(source => ({
      value: source,
      label: this.getSourceLabel(source)
    }));
  }

  getPrioritiesOptions() {
    return Object.values(LeadPriority).map(priority => ({
      value: priority,
      label: this.getPriorityLabel(priority)
    }));
  }

  getStatusesOptions() {
    return Object.values(LeadStatus).map(status => ({
      value: status,
      label: this.getStatusLabel(status)
    }));
  }

  private getSourceLabel(source: LeadSource): string {
    const labels: Record<LeadSource, string> = {
      [LeadSource.WEBSITE]: 'Веб-сайт',
      [LeadSource.FACEBOOK]: 'Facebook',
      [LeadSource.GOOGLE_ADS]: 'Google Ads',
      [LeadSource.LINKEDIN]: 'LinkedIn',
      [LeadSource.EMAIL]: 'Email',
      [LeadSource.PHONE]: 'Телефон',
      [LeadSource.REFERRAL]: 'Рекомендация',
      [LeadSource.OTHER]: 'Другое'
    };
    return labels[source] || source;
  }

  private getPriorityLabel(priority: LeadPriority): string {
    const labels: Record<LeadPriority, string> = {
      [LeadPriority.LOW]: 'Низкий',
      [LeadPriority.MEDIUM]: 'Средний',
      [LeadPriority.HIGH]: 'Высокий',
      [LeadPriority.URGENT]: 'Срочный'
    };
    return labels[priority] || priority;
  }

  private getStatusLabel(status: LeadStatus): string {
    const labels: Record<LeadStatus, string> = {
      [LeadStatus.NEW]: 'Новый',
      [LeadStatus.CONTACTED]: 'Контактирован',
      [LeadStatus.QUALIFIED]: 'Квалифицирован',
      [LeadStatus.PROPOSAL_SENT]: 'Предложение отправлено',
      [LeadStatus.NEGOTIATING]: 'Переговоры',
      [LeadStatus.CONVERTED]: 'Конвертирован',
      [LeadStatus.REJECTED]: 'Отклонен',
      [LeadStatus.LOST]: 'Потерян'
    };
    return labels[status] || status;
  }
}