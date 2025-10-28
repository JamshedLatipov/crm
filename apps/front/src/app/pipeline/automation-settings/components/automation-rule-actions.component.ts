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
import { AutomationAction, AutomationActionRule, Stage } from '../../dtos';
import { Manager } from '../../../shared/types/common.types';

@Component({
  selector: 'app-automation-rule-actions',
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
    <mat-card-content>
      <div class="actions-logic">
        <span class="logic-label">Действия выполняются последовательно</span>
      </div>

      <div *ngFor="let action of actions(); let i = index" class="action-item">
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
                  <mat-label>Выберите менеджера</mat-label>
                  <mat-select [(ngModel)]="action.config['userId']">
                    <mat-option *ngFor="let manager of managers()" [value]="manager.id">
                      {{ manager.fullName }}
                    </mat-option>
                  </mat-select>
                  <mat-hint>Менеджер, которому будет назначена сделка</mat-hint>
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
                    <mat-select [(ngModel)]="action.config['assignedTo']">
                      <mat-option *ngFor="let manager of managers()" [value]="manager.id">
                        {{ manager.fullName }}
                      </mat-option>
                    </mat-select>
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
                      <mat-select [(ngModel)]="action.config['assignedTo']">
                        <mat-option *ngFor="let manager of managers()" [value]="manager.id">
                          {{ manager.fullName }}
                        </mat-option>
                      </mat-select>
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

      <div *ngIf="!actions()?.length" class="no-actions">
        <mat-icon>play_circle_outline</mat-icon>
        <div class="no-actions-content">
          <h4>Действий нет</h4>
          <p>Добавьте хотя бы одно действие, которое будет выполняться при срабатывании правила.</p>
          <p class="hint">Используйте кнопку "+" выше, чтобы добавить автоматические действия.</p>
        </div>
      </div>

      <!-- Статистика действий -->
      <div class="actions-summary" *ngIf="actions()?.length > 0">
        <mat-chip-listbox>
          <mat-chip>{{ actions().length }} действи{{ getActionsWord(actions().length) }}</mat-chip>
        </mat-chip-listbox>
      </div>
    </mat-card-content>
  `,
  styleUrls: ['./automation-rule-actions.component.scss']
})
export class AutomationRuleActionsComponent {
  // Inputs
  actions = input<AutomationActionRule[]>([]);
  stages = input<Stage[]>([]);
  managers = input<Manager[]>([]);

  // Outputs
  removeAction = output<number>();

  // Опции для форм
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

  getActionsWord(count: number): string {
    if (count === 1) return 'е';
    if (count >= 2 && count <= 4) return 'я';
    return 'й';
  }
}