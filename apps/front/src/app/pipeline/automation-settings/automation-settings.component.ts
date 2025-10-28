import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PipelineService } from '../pipeline.service';
import { Stage, AutomationRule, AutomationTrigger, AutomationAction } from '../dtos';

@Component({
  selector: 'app-automation-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './automation-settings.component.html',
  styleUrls: ['./automation-settings.component.scss']
})
export class AutomationSettingsComponent implements OnInit {
  private readonly pipelineService = inject(PipelineService);
  public readonly dialogRef = inject(MatDialogRef<AutomationSettingsComponent>);

  // Состояние
  rules = signal<AutomationRule[]>([]);
  stages = signal<Stage[]>([]);
  isLoading = signal(false);
  selectedRule = signal<AutomationRule | null>(null);
  isEditingNew = signal(false);

  // Форма нового правила
  newRule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'lastTriggeredAt' | 'triggerCount'> = {
    name: '',
    description: '',
    trigger: AutomationTrigger.DEAL_CREATED,
    conditions: [],
    actions: [],
    isActive: true,
    priority: 0
  };

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

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.isLoading.set(true);

    // Загружаем правила и этапы параллельно
    Promise.all([
      this.pipelineService.getAutomationRules().toPromise(),
      this.pipelineService.listAllStages().toPromise()
    ]).then(([rules, stages]) => {
      // Инициализируем массивы по умолчанию для каждого правила
      const processedRules = (rules as AutomationRule[] || []).map(rule => ({
        ...rule,
        conditions: rule.conditions || [],
        actions: rule.actions || []
      }));
      this.rules.set(processedRules);
      this.stages.set(stages || []);
      this.isLoading.set(false);
    }).catch(error => {
      console.error('Error loading automation data:', error);
      this.isLoading.set(false);
    });
  }

  createRule() {
    if (!this.newRule.name.trim()) return;

    this.pipelineService.createAutomationRule(this.newRule).subscribe({
      next: (rule) => {
        this.rules.update(rules => [...rules, rule]);
        this.resetNewRule();
        this.isEditingNew.set(false);
      },
      error: (error) => {
        console.error('Error creating rule:', error);
      }
    });
  }

  updateRule(rule: AutomationRule) {
    if (!rule.id) return;

    // Убедимся, что массивы инициализированы перед отправкой
    const ruleToUpdate = {
      ...rule,
      conditions: rule.conditions || [],
      actions: rule.actions || []
    };

    this.pipelineService.updateAutomationRule(rule.id, ruleToUpdate).subscribe({
      next: (updatedRule) => {
        this.rules.update(rules =>
          rules.map(r => r.id === rule.id ? {
            ...updatedRule,
            conditions: updatedRule.conditions || [],
            actions: updatedRule.actions || []
          } as AutomationRule : r)
        );
        this.selectedRule.set(null);
      },
      error: (error) => {
        console.error('Error updating rule:', error);
      }
    });
  }

  deleteRule(ruleId: string) {
    this.pipelineService.deleteAutomationRule(ruleId).subscribe({
      next: () => {
        this.rules.update(rules => rules.filter(r => r.id !== ruleId));
      },
      error: (error) => {
        console.error('Error deleting rule:', error);
      }
    });
  }

  toggleRule(rule: AutomationRule) {
    const updatedRule = { ...rule, isActive: !rule.isActive };
    this.updateRule(updatedRule);
  }

  selectRule(rule: AutomationRule) {
    this.selectedRule.set({
      ...rule,
      conditions: rule.conditions || [],
      actions: rule.actions || []
    });
    this.isEditingNew.set(false);
  }

  cancelEdit() {
    this.selectedRule.set(null);
    this.isEditingNew.set(false);
  }

  private resetNewRule() {
    this.newRule = {
      name: '',
      description: '',
      trigger: AutomationTrigger.DEAL_CREATED,
      conditions: [],
      actions: [],
      isActive: true,
      priority: 0
    };
  }

  getTriggerLabel(trigger: AutomationTrigger): string {
    const triggerType = this.triggerTypes.find(t => t.value === trigger);
    return triggerType?.label || trigger;
  }

  getActionsCount(actions: any[]): number {
    return actions?.length || 0;
  }

  triggerAutomation() {
    this.pipelineService.runAutomation().subscribe({
      next: (result) => {
        console.log('Automation triggered:', result);
        // Можно добавить уведомление пользователю
      },
      error: (error) => {
        console.error('Error triggering automation:', error);
      }
    });
  }

  addCondition() {
    const target = this.selectedRule() || this.newRule;
    if (target) {
      if (this.selectedRule()) {
        this.selectedRule.update(rule => ({
          ...rule!,
          conditions: [...rule!.conditions, {
            field: 'STAGE_EQUALS' as any,
            operator: 'equals',
            value: ''
          }]
        }));
      } else {
        this.newRule.conditions.push({
          field: 'STAGE_EQUALS' as any,
          operator: 'equals',
          value: ''
        });
      }
    }
  }

  removeCondition(index: number) {
    const target = this.selectedRule() || this.newRule;
    if (target) {
      if (this.selectedRule()) {
        this.selectedRule.update(rule => ({
          ...rule!,
          conditions: rule!.conditions.filter((_, i) => i !== index)
        }));
      } else {
        this.newRule.conditions.splice(index, 1);
      }
    }
  }

  addAction() {
    const target = this.selectedRule() || this.newRule;
    if (target) {
      if (this.selectedRule()) {
        this.selectedRule.update(rule => ({
          ...rule!,
          actions: [...rule!.actions, {
            type: AutomationAction.SEND_NOTIFICATION,
            config: {}
          }]
        }));
      } else {
        this.newRule.actions.push({
          type: AutomationAction.SEND_NOTIFICATION,
          config: {}
        });
      }
    }
  }

  removeAction(index: number) {
    const target = this.selectedRule() || this.newRule;
    if (target) {
      if (this.selectedRule()) {
        this.selectedRule.update(rule => ({
          ...rule!,
          actions: rule!.actions.filter((_, i) => i !== index)
        }));
      } else {
        this.newRule.actions.splice(index, 1);
      }
    }
  }

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

  // Новые методы для улучшенного дизайна условий
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

  onConditionFieldChange(index: number): void {
    // Можно добавить логику для сброса значений при изменении типа условия
    const target = this.selectedRule() || this.newRule;
    if (target && target.conditions[index]) {
      // Сбросить значения при изменении типа
      target.conditions[index].value = '';
      if (target.conditions[index].value2 !== undefined) {
        target.conditions[index].value2 = undefined;
      }
    }
  }

  getConditionsWord(count: number): string {
    if (count === 1) return 'е';
    if (count >= 2 && count <= 4) return 'я';
    return 'й';
  }

  createNewRule() {
    this.selectedRule.set(null);
    this.isEditingNew.set(true);
  }

  // Новые методы для улучшенного дизайна действий
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

  getActionLabel(type: string): string {
    const actionType = this.actionTypes.find(a => a.value === type);
    return actionType?.label || type;
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