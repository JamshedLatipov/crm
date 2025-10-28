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
import { AutomationCondition, AutomationConditionRule, Stage } from '../../dtos';
import { Manager } from '../../../shared/types/common.types';
import { LeadStatus, LeadSource, LeadPriority } from '../../../shared/types/common.types';

@Component({
  selector: 'app-automation-rule-conditions',
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

      <div *ngFor="let condition of conditions(); let i = index" class="condition-item">
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
                    <mat-option value="{{AutomationCondition.STAGE_EQUALS}}">
                      <mat-icon>timeline</mat-icon>
                      Этап равен
                    </mat-option>
                    <mat-option value="{{AutomationCondition.STAGE_NOT_EQUALS}}">
                      <mat-icon>timeline</mat-icon>
                      Этап не равен
                    </mat-option>
                    <mat-option value="{{AutomationCondition.STATUS_EQUALS}}">
                      <mat-icon>flag</mat-icon>
                      Статус равен
                    </mat-option>
                    <mat-option value="{{AutomationCondition.AMOUNT_GREATER_THAN}}">
                      <mat-icon>trending_up</mat-icon>
                      Сумма больше
                    </mat-option>
                    <mat-option value="{{AutomationCondition.AMOUNT_LESS_THAN}}">
                      <mat-icon>trending_down</mat-icon>
                      Сумма меньше
                    </mat-option>
                    <mat-option value="{{AutomationCondition.AMOUNT_BETWEEN}}">
                      <mat-icon>compare_arrows</mat-icon>
                      Сумма между
                    </mat-option>
                    <mat-option value="{{AutomationCondition.ASSIGNED_TO_EQUALS}}">
                      <mat-icon>person</mat-icon>
                      Назначен менеджеру
                    </mat-option>
                    <mat-option value="{{AutomationCondition.TAGS_CONTAIN}}">
                      <mat-icon>label</mat-icon>
                      Содержит теги
                    </mat-option>
                    <mat-option value="{{AutomationCondition.TAGS_NOT_CONTAIN}}">
                      <mat-icon>label_off</mat-icon>
                      Не содержит теги
                    </mat-option>
                    <mat-option value="{{AutomationCondition.SOURCE_EQUALS}}">
                      <mat-icon>link</mat-icon>
                      Источник равен
                    </mat-option>
                    <mat-option value="{{AutomationCondition.PRIORITY_EQUALS}}">
                      <mat-icon>priority_high</mat-icon>
                      Приоритет равен
                    </mat-option>
                    <mat-option value="{{AutomationCondition.SCORE_GREATER_THAN}}">
                      <mat-icon>star</mat-icon>
                      Скор больше
                    </mat-option>
                    <mat-option value="{{AutomationCondition.CREATED_WITHIN_DAYS}}">
                      <mat-icon>schedule</mat-icon>
                      Создан за последние дни
                    </mat-option>
                  </mat-select>
                </mat-form-field>

                <!-- Для полей со справочниками - используем select -->
                <mat-form-field appearance="outline" class="condition-value" *ngIf="!isBetweenCondition(condition.field) && isReferenceField(condition.field)">
                  <mat-label>{{ getConditionValueLabel(condition.field) }}</mat-label>
                  <mat-select [(ngModel)]="condition.value">
                    <!-- Этапы -->
                    <ng-container *ngIf="condition.field === AutomationCondition.STAGE_EQUALS || condition.field === AutomationCondition.STAGE_NOT_EQUALS">
                      <mat-option *ngFor="let stage of stages()" [value]="stage.id">
                        {{ stage.name }}
                      </mat-option>
                    </ng-container>
                    <!-- Менеджеры -->
                    <ng-container *ngIf="condition.field === AutomationCondition.ASSIGNED_TO_EQUALS">
                      <mat-option *ngFor="let manager of managers()" [value]="manager.id">
                        {{ manager.fullName }}
                      </mat-option>
                    </ng-container>
                    <!-- Источники -->
                    <ng-container *ngIf="condition.field === AutomationCondition.SOURCE_EQUALS">
                      <mat-option *ngFor="let source of getSourcesOptions()" [value]="source.value">
                        {{ source.label }}
                      </mat-option>
                    </ng-container>
                    <!-- Приоритеты -->
                    <ng-container *ngIf="condition.field === AutomationCondition.PRIORITY_EQUALS">
                      <mat-option *ngFor="let priority of getPrioritiesOptions()" [value]="priority.value">
                        {{ priority.label }}
                      </mat-option>
                    </ng-container>
                    <!-- Статусы -->
                    <ng-container *ngIf="condition.field === AutomationCondition.STATUS_EQUALS">
                      <mat-option *ngFor="let status of getStatusesOptions()" [value]="status.value">
                        {{ status.label }}
                      </mat-option>
                    </ng-container>
                  </mat-select>
                </mat-form-field>

                <!-- Для обычных полей - используем input -->
                <mat-form-field appearance="outline" class="condition-value" *ngIf="!isBetweenCondition(condition.field) && !isReferenceField(condition.field)">
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

      <div *ngIf="!conditions()?.length" class="no-conditions">
        <mat-icon>filter_alt_off</mat-icon>
        <div class="no-conditions-content">
          <h4>Условий нет</h4>
          <p>Правило будет применяться ко всем объектам, соответствующим триггеру.</p>
          <p class="hint">Используйте кнопку "+" выше, чтобы добавить условия фильтрации и сделать правило более точным.</p>
        </div>
      </div>

      <!-- Статистика условий -->
      <div class="conditions-summary" *ngIf="conditions()?.length > 0">
        <mat-chip-listbox>
          <mat-chip>{{ conditions().length }} услови{{ getConditionsWord(conditions().length) }}</mat-chip>
        </mat-chip-listbox>
      </div>
    </mat-card-content>
  `,
  styleUrls: ['./automation-rule-conditions.component.scss']
})
export class AutomationRuleConditionsComponent {
  // Ссылка на enum для использования в шаблоне
  protected readonly AutomationCondition = AutomationCondition;

  // Inputs
  conditions = input<AutomationConditionRule[]>([]);
  stages = input<Stage[]>([]);
  managers = input<Manager[]>([]);
  sourcesInput = input<{ value: string; label: string }[]>([]);
  prioritiesInput = input<{ value: string; label: string }[]>([]);
  statusesInput = input<{ value: string; label: string }[]>([]);

  // Outputs
  removeCondition = output<number>();
  onConditionFieldChange = output<{ index: number; field: AutomationCondition }>();

  // Опции для справочников
  private readonly sourcesOptions = signal([
    { value: LeadSource.WEBSITE, label: 'Веб-сайт' },
    { value: LeadSource.FACEBOOK, label: 'Facebook' },
    { value: LeadSource.GOOGLE_ADS, label: 'Google Ads' },
    { value: LeadSource.LINKEDIN, label: 'LinkedIn' },
    { value: LeadSource.EMAIL, label: 'Email' },
    { value: LeadSource.PHONE, label: 'Телефон' },
    { value: LeadSource.REFERRAL, label: 'Рекомендация' },
    { value: LeadSource.OTHER, label: 'Другое' }
  ]);

  private readonly prioritiesOptions = signal([
    { value: LeadPriority.LOW, label: 'Низкий' },
    { value: LeadPriority.MEDIUM, label: 'Средний' },
    { value: LeadPriority.HIGH, label: 'Высокий' },
    { value: LeadPriority.URGENT, label: 'Срочный' }
  ]);

  private readonly statusesOptions = signal([
    { value: LeadStatus.NEW, label: 'Новый' },
    { value: LeadStatus.CONTACTED, label: 'Контактирован' },
    { value: LeadStatus.QUALIFIED, label: 'Квалифицирован' },
    { value: LeadStatus.PROPOSAL_SENT, label: 'Предложение отправлено' },
    { value: LeadStatus.NEGOTIATING, label: 'Переговоры' },
    { value: LeadStatus.CONVERTED, label: 'Конвертирован' },
    { value: LeadStatus.REJECTED, label: 'Отклонен' },
    { value: LeadStatus.LOST, label: 'Потерян' }
  ]);

  // Вспомогательные методы для условий
  getConditionPlaceholder(field: AutomationCondition): string {
    switch (field) {
      case AutomationCondition.STAGE_EQUALS:
      case AutomationCondition.STAGE_NOT_EQUALS:
        return 'ID этапа';
      case AutomationCondition.STATUS_EQUALS:
        return 'статус';
      case AutomationCondition.AMOUNT_GREATER_THAN:
      case AutomationCondition.AMOUNT_LESS_THAN:
      case AutomationCondition.AMOUNT_BETWEEN:
        return 'Сумма в TJS';
      case AutomationCondition.ASSIGNED_TO_EQUALS:
        return 'ID менеджера';
      case AutomationCondition.TAGS_CONTAIN:
      case AutomationCondition.TAGS_NOT_CONTAIN:
        return 'тег1, тег2';
      case AutomationCondition.SOURCE_EQUALS:
        return 'источник';
      case AutomationCondition.PRIORITY_EQUALS:
        return 'приоритет';
      case AutomationCondition.SCORE_GREATER_THAN:
        return 'баллы';
      case AutomationCondition.CREATED_WITHIN_DAYS:
        return 'количество дней';
      default:
        return 'Значение';
    }
  }

  getConditionIcon(field: AutomationCondition): string {
    switch (field) {
      case AutomationCondition.STAGE_EQUALS:
      case AutomationCondition.STAGE_NOT_EQUALS:
        return 'timeline';
      case AutomationCondition.STATUS_EQUALS:
        return 'flag';
      case AutomationCondition.AMOUNT_GREATER_THAN:
      case AutomationCondition.AMOUNT_LESS_THAN:
      case AutomationCondition.AMOUNT_BETWEEN:
        return 'attach_money';
      case AutomationCondition.ASSIGNED_TO_EQUALS:
        return 'person';
      case AutomationCondition.TAGS_CONTAIN:
      case AutomationCondition.TAGS_NOT_CONTAIN:
        return 'label';
      case AutomationCondition.SOURCE_EQUALS:
        return 'link';
      case AutomationCondition.PRIORITY_EQUALS:
        return 'priority_high';
      case AutomationCondition.SCORE_GREATER_THAN:
        return 'star';
      case AutomationCondition.CREATED_WITHIN_DAYS:
        return 'schedule';
      default:
        return 'filter_list';
    }
  }

  getConditionValueLabel(field: AutomationCondition): string {
    switch (field) {
      case AutomationCondition.STAGE_EQUALS:
      case AutomationCondition.STAGE_NOT_EQUALS:
        return 'Этап';
      case AutomationCondition.STATUS_EQUALS:
        return 'Статус';
      case AutomationCondition.AMOUNT_GREATER_THAN:
      case AutomationCondition.AMOUNT_LESS_THAN:
        return 'Сумма';
      case AutomationCondition.AMOUNT_BETWEEN:
        return 'Диапазон суммы';
      case AutomationCondition.ASSIGNED_TO_EQUALS:
        return 'Менеджер';
      case AutomationCondition.TAGS_CONTAIN:
      case AutomationCondition.TAGS_NOT_CONTAIN:
        return 'Теги';
      case AutomationCondition.SOURCE_EQUALS:
        return 'Источник';
      case AutomationCondition.PRIORITY_EQUALS:
        return 'Приоритет';
      case AutomationCondition.SCORE_GREATER_THAN:
        return 'Минимальный скор';
      case AutomationCondition.CREATED_WITHIN_DAYS:
        return 'Дни';
      default:
        return 'Значение';
    }
  }

  getConditionHint(field: AutomationCondition): string {
    switch (field) {
      case AutomationCondition.STAGE_EQUALS:
        return 'Выберите этап из списка';
      case AutomationCondition.AMOUNT_GREATER_THAN:
        return 'Сделки с суммой больше указанной';
      case AutomationCondition.AMOUNT_LESS_THAN:
        return 'Сделки с суммой меньше указанной';
      case AutomationCondition.TAGS_CONTAIN:
        return 'Через запятую, без пробелов';
      case AutomationCondition.ASSIGNED_TO_EQUALS:
        return 'Выберите менеджера из списка';
      case AutomationCondition.SOURCE_EQUALS:
        return 'Выберите источник лида';
      case AutomationCondition.PRIORITY_EQUALS:
        return 'Выберите приоритет';
      case AutomationCondition.STATUS_EQUALS:
        return 'Выберите статус';
      case AutomationCondition.CREATED_WITHIN_DAYS:
        return 'Количество дней с момента создания';
      default:
        return '';
    }
  }

  getConditionDescription(field: AutomationCondition): string {
    switch (field) {
      case AutomationCondition.STAGE_EQUALS:
        return 'Применяется только к сделкам на выбранном этапе';
      case AutomationCondition.AMOUNT_GREATER_THAN:
        return 'Фильтрует сделки по минимальной сумме';
      case AutomationCondition.AMOUNT_LESS_THAN:
        return 'Фильтрует сделки по максимальной сумме';
      case AutomationCondition.TAGS_CONTAIN:
        return 'Сделка должна содержать хотя бы один из указанных тегов';
      case AutomationCondition.ASSIGNED_TO_EQUALS:
        return 'Только сделки назначенные конкретному менеджеру';
      case AutomationCondition.SOURCE_EQUALS:
        return 'Фильтрует по источнику поступления лида';
      case AutomationCondition.PRIORITY_EQUALS:
        return 'Фильтрует по уровню приоритета';
      case AutomationCondition.STATUS_EQUALS:
        return 'Фильтрует по текущему статусу';
      case AutomationCondition.CREATED_WITHIN_DAYS:
        return 'Сделки созданные не более указанного количества дней назад';
      default:
        return 'Дополнительный фильтр для правила';
    }
  }

  isBetweenCondition(field: AutomationCondition): boolean {
    return field === AutomationCondition.AMOUNT_BETWEEN;
  }

  isReferenceField(field: AutomationCondition): boolean {
    return [
      AutomationCondition.STAGE_EQUALS,
      AutomationCondition.STAGE_NOT_EQUALS,
      AutomationCondition.ASSIGNED_TO_EQUALS,
      AutomationCondition.SOURCE_EQUALS,
      AutomationCondition.PRIORITY_EQUALS,
      AutomationCondition.STATUS_EQUALS
    ].includes(field);
  }

  getConditionsWord(count: number): string {
    if (count === 1) return 'е';
    if (count >= 2 && count <= 4) return 'я';
    return 'й';
  }

  // Геттеры для доступа к опциям в шаблоне
  getSourcesOptions() { return this.sourcesOptions(); }
  getPrioritiesOptions() { return this.prioritiesOptions(); }
  getStatusesOptions() { return this.statusesOptions(); }
}