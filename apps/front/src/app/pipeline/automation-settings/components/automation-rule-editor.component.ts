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
    MatTooltipModule
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

            <div *ngFor="let condition of (selectedRule() || newRule()).conditions; let i = index" class="condition-item">
              <div class="condition-card">
                <div class="condition-header">
                  <div class="condition-icon">
                    <mat-icon>{{ getConditionIcon(condition.field) }}</mat-icon>
                  </div>
                  <div class="condition-content">
                    <div class="condition-row">
                      <mat-form-field appearance="outline" class="condition-field">
                        <mat-label>Тип условия</mat-label>
                        <mat-select [(ngModel)]="condition.field" (ngModelChange)="onConditionFieldChange.emit({ index: i, field: condition.field })">
                          <mat-option value="STAGE_EQUALS">
                            <mat-icon>timeline</mat-icon>
                            Этап равен
                          </mat-option>
                          <mat-option value="STAGE_NOT_EQUALS">
                            <mat-icon>timeline</mat-icon>
                            Этап не равен
                          </mat-option>
                          <mat-option value="STATUS_EQUALS">
                            <mat-icon>flag</mat-icon>
                            Статус равен
                          </mat-option>
                          <mat-option value="AMOUNT_GREATER_THAN">
                            <mat-icon>trending_up</mat-icon>
                            Сумма больше
                          </mat-option>
                          <mat-option value="AMOUNT_LESS_THAN">
                            <mat-icon>trending_down</mat-icon>
                            Сумма меньше
                          </mat-option>
                          <mat-option value="AMOUNT_BETWEEN">
                            <mat-icon>compare_arrows</mat-icon>
                            Сумма между
                          </mat-option>
                          <mat-option value="ASSIGNED_TO_EQUALS">
                            <mat-icon>person</mat-icon>
                            Назначен менеджеру
                          </mat-option>
                          <mat-option value="TAGS_CONTAIN">
                            <mat-icon>label</mat-icon>
                            Содержит теги
                          </mat-option>
                          <mat-option value="TAGS_NOT_CONTAIN">
                            <mat-icon>label_off</mat-icon>
                            Не содержит теги
                          </mat-option>
                          <mat-option value="SOURCE_EQUALS">
                            <mat-icon>link</mat-icon>
                            Источник равен
                          </mat-option>
                          <mat-option value="PRIORITY_EQUALS">
                            <mat-icon>priority_high</mat-icon>
                            Приоритет равен
                          </mat-option>
                          <mat-option value="SCORE_GREATER_THAN">
                            <mat-icon>star</mat-icon>
                            Скор больше
                          </mat-option>
                          <mat-option value="CREATED_WITHIN_DAYS">
                            <mat-icon>schedule</mat-icon>
                            Создан за последние дни
                          </mat-option>
                        </mat-select>
                      </mat-form-field>

                      <mat-form-field appearance="outline" class="condition-value" *ngIf="!isBetweenCondition(condition.field)">
                        <mat-label>{{ getConditionValueLabel(condition.field) }}</mat-label>
                        <input matInput [(ngModel)]="condition.value" [placeholder]="getConditionPlaceholder(condition.field)">
                        <mat-hint>{{ getConditionHint(condition.field) }}</mat-hint>
                      </mat-form-field>

                      <!-- Для условий "между" -->
                      <div class="between-values" *ngIf="isBetweenCondition(condition.field)">
                        <mat-form-field appearance="outline" class="condition-value">
                          <mat-label>От</mat-label>
                          <input matInput [(ngModel)]="condition.value" [placeholder]="getConditionPlaceholder(condition.field)">
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="condition-value">
                          <mat-label>До</mat-label>
                          <input matInput [(ngModel)]="condition.value2" placeholder="Максимальное значение">
                        </mat-form-field>
                      </div>
                    </div>

                    <!-- Дополнительная информация -->
                    <div class="condition-info" *ngIf="condition.field">
                      <small class="condition-description">{{ getConditionDescription(condition.field) }}</small>
                    </div>
                  </div>

                  <div class="condition-actions">
                    <button mat-icon-button color="warn" (click)="removeCondition.emit(i)" matTooltip="Удалить условие">
                      <mat-icon>delete</mat-icon>
                    </button>
                    <div class="condition-number">{{ i + 1 }}</div>
                  </div>
                </div>
              </div>
            </div>

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
            <div class="actions-logic">
              <span class="logic-label">Действия выполняются последовательно</span>
            </div>

            <div *ngFor="let action of (selectedRule() || newRule()).actions; let i = index" class="action-item">
              <div class="action-card">
                <div class="action-header">
                  <div class="action-icon">
                    <mat-icon>{{ getActionIcon(action.type) }}</mat-icon>
                  </div>
                  <div class="action-content">
                    <div class="action-row">
                      <mat-form-field appearance="outline" class="action-field">
                        <mat-label>Тип действия</mat-label>
                        <mat-select [(ngModel)]="action.type">
                          <mat-option *ngFor="let type of actionTypes" [value]="type.value">
                            <mat-icon>{{ getActionIcon(type.value) }}</mat-icon>
                            {{ type.label }}
                          </mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>

                    <!-- Дополнительная информация -->
                    <div class="action-info" *ngIf="action.type">
                      <small class="action-description">{{ getActionDescription(action.type) }}</small>
                      <small class="action-hint" *ngIf="getActionHint(action.type)">{{ getActionHint(action.type) }}</small>
                    </div>

                    <!-- Конфигурация действия в зависимости от типа -->
                    <div class="action-config" [ngSwitch]="action.type">
                      <!-- Изменить этап -->
                      <mat-form-field appearance="outline" *ngSwitchCase="'change_stage'" class="config-field">
                        <mat-label>Выберите этап</mat-label>
                        <mat-select [(ngModel)]="action.config['stageId']">
                          <mat-option *ngFor="let stage of stages()" [value]="stage.id">
                            {{ stage.name }}
                          </mat-option>
                        </mat-select>
                      </mat-form-field>

                      <!-- Изменить статус -->
                      <mat-form-field appearance="outline" *ngSwitchCase="'change_status'" class="config-field">
                        <mat-label>Новый статус</mat-label>
                        <input matInput [(ngModel)]="action.config['status']" placeholder="Например: won, lost, pending">
                      </mat-form-field>

                      <!-- Назначить пользователю -->
                      <mat-form-field appearance="outline" *ngSwitchCase="'assign_to_user'" class="config-field">
                        <mat-label>ID пользователя</mat-label>
                        <input matInput [(ngModel)]="action.config['userId']" placeholder="ID менеджера">
                        <mat-hint>Пользователь, которому будет назначена сделка</mat-hint>
                      </mat-form-field>

                      <!-- Отправить уведомление -->
                      <div class="notification-section" *ngSwitchCase="'send_notification'">
                        <mat-form-field appearance="outline" class="config-field">
                          <mat-label>Тип уведомления</mat-label>
                          <mat-select [(ngModel)]="action.config['type']">
                            <mat-option *ngFor="let type of notificationTypes" [value]="type.value">
                              {{ type.label }}
                            </mat-option>
                          </mat-select>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="config-field full-width">
                          <mat-label>Текст сообщения</mat-label>
                          <textarea
                            matInput
                            [(ngModel)]="action.config['message']"
                            rows="3"
                            placeholder="Введите текст уведомления. Используйте переменные: &#123;deal.title&#125;, &#123;deal.amount&#125;, &#123;manager.name&#125;"
                          ></textarea>
                          <mat-hint>Поддерживаются переменные: &#123;deal.title&#125;, &#123;deal.amount&#125;, &#123;manager.name&#125;</mat-hint>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="config-field full-width">
                          <mat-label>Получатели (email)</mat-label>
                          <input matInput [(ngModel)]="action.config['recipients']" placeholder="email1@example.com, email2@example.com">
                          <mat-hint>Несколько email через запятую</mat-hint>
                        </mat-form-field>
                      </div>

                      <!-- Создать задачу -->
                      <div class="task-section" *ngSwitchCase="'create_task'">
                        <div class="config-row">
                          <mat-form-field appearance="outline" class="config-field">
                            <mat-label>Название задачи</mat-label>
                            <input matInput [(ngModel)]="action.config['title']" placeholder="Краткое название">
                          </mat-form-field>

                          <mat-form-field appearance="outline" class="config-field">
                            <mat-label>Дедлайн (дни)</mat-label>
                            <input matInput type="number" [(ngModel)]="action.config['dueInDays']" min="1" placeholder="7">
                          </mat-form-field>
                        </div>

                        <mat-form-field appearance="outline" class="config-field full-width">
                          <mat-label>Описание</mat-label>
                          <textarea
                            matInput
                            [(ngModel)]="action.config['description']"
                            rows="2"
                            placeholder="Подробное описание задачи"
                          ></textarea>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="config-field">
                          <mat-label>Назначить</mat-label>
                          <input matInput [(ngModel)]="action.config['assignedTo']" placeholder="ID пользователя">
                          <mat-hint>ID менеджера, ответственного за задачу</mat-hint>
                        </mat-form-field>
                      </div>

                      <!-- Обновить сумму -->
                      <mat-form-field appearance="outline" *ngSwitchCase="'update_amount'" class="config-field">
                        <mat-label>Новая сумма (TJS)</mat-label>
                        <input matInput type="number" [(ngModel)]="action.config['amount']" min="0" placeholder="100000">
                        <mat-hint>Сумма в сомони без разделителей</mat-hint>
                      </mat-form-field>

                      <!-- Добавить теги -->
                      <mat-form-field appearance="outline" *ngSwitchCase="'add_tags'" class="config-field">
                        <mat-label>Теги (через запятую)</mat-label>
                        <input matInput [(ngModel)]="action.config['tags']" placeholder="vip, срочный, повторный">
                        <mat-hint>Теги для категоризации сделки</mat-hint>
                      </mat-form-field>

                      <!-- Отправить email -->
                      <div class="email-section" *ngSwitchCase="'send_email'">
                        <mat-form-field appearance="outline" class="config-field full-width">
                          <mat-label>Тема письма</mat-label>
                          <input matInput [(ngModel)]="action.config['subject']" placeholder="Тема email">
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="config-field full-width">
                          <mat-label>Текст письма</mat-label>
                          <textarea
                            matInput
                            [(ngModel)]="action.config['body']"
                            rows="4"
                            placeholder="Текст email-сообщения"
                          ></textarea>
                        </mat-form-field>

                        <mat-form-field appearance="outline" class="config-field full-width">
                          <mat-label>Получатели</mat-label>
                          <input matInput [(ngModel)]="action.config['recipients']" placeholder="email@example.com">
                          <mat-hint>Один или несколько email через запятую</mat-hint>
                        </mat-form-field>
                      </div>

                      <!-- Установить напоминание -->
                      <div class="reminder-section" *ngSwitchCase="'set_reminder'">
                        <div class="config-row">
                          <mat-form-field appearance="outline" class="config-field">
                            <mat-label>Через (часы)</mat-label>
                            <input matInput type="number" [(ngModel)]="action.config['hoursFromNow']" min="1" placeholder="24">
                          </mat-form-field>

                          <mat-form-field appearance="outline" class="config-field">
                            <mat-label>Назначить</mat-label>
                            <input matInput [(ngModel)]="action.config['assignedTo']" placeholder="ID пользователя">
                          </mat-form-field>
                        </div>

                        <mat-form-field appearance="outline" class="config-field full-width">
                          <mat-label>Текст напоминания</mat-label>
                          <textarea
                            matInput
                            [(ngModel)]="action.config['message']"
                            rows="2"
                            placeholder="Текст напоминания для менеджера"
                          ></textarea>
                        </mat-form-field>
                      </div>
                    </div>
                  </div>

                  <div class="action-actions">
                    <button mat-icon-button color="warn" (click)="removeAction.emit(i)" matTooltip="Удалить действие">
                      <mat-icon>delete</mat-icon>
                    </button>
                    <div class="action-number">{{ i + 1 }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="!(selectedRule() || newRule()).actions?.length" class="no-actions">
              <mat-icon>play_circle_outline</mat-icon>
              <div class="no-actions-content">
                <h4>Действий нет</h4>
                <p>Добавьте хотя бы одно действие, которое будет выполняться при срабатывании правила.</p>
                <p class="hint">Используйте кнопку "+" выше, чтобы добавить автоматические действия.</p>
              </div>
            </div>

            <!-- Статистика действий -->
            <div class="actions-summary" *ngIf="(selectedRule() || newRule()).actions?.length > 0">
              <mat-chip-listbox>
                <mat-chip>{{ (selectedRule() || newRule()).actions.length }} действи{{ getActionsWord((selectedRule() || newRule()).actions.length) }}</mat-chip>
              </mat-chip-listbox>
            </div>
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
}