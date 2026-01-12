import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { MessageBackButtonComponent } from '../../shared/message-back-button/message-back-button.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../../shared/components/crm-table/crm-table.component';
import { SmsTemplateService } from '../../../services/sms-template.service';
import { SmsTemplate } from '../../../models/message.models';

@Component({
  selector: 'app-sms-template-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CrmTableComponent,
    CrmColumnTemplateDirective,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatSnackBarModule,
    PageLayoutComponent,
    MessageBackButtonComponent
  ],
  templateUrl: './sms-template-list.component.html',
  styleUrl: './sms-template-list.component.scss'
})
export class SmsTemplateListComponent implements OnInit {
  private readonly smsTemplateService = inject(SmsTemplateService);
  private readonly snackBar = inject(MatSnackBar);

  loading = this.smsTemplateService.isLoading;
  templates = this.smsTemplateService.templates;

  columns: CrmColumn[] = [
    { key: 'name', label: 'Название', sortable: true },
    { key: 'content', label: 'Содержимое', template: 'contentTemplate' },
    { key: 'variables', label: 'Переменные', template: 'variablesTemplate' },
    { key: 'isActive', label: 'Статус', template: 'statusTemplate' },
    { key: 'actions', label: 'Действия', template: 'actionsTemplate' },
  ];

  ngOnInit() {
    this.loadTemplates();
  }

  loadTemplates() {
    this.smsTemplateService.getAll().subscribe({
      error: () => {
        this.snackBar.open('Ошибка загрузки шаблонов', 'Закрыть', { duration: 3000 });
      }
    });
  }

  deleteTemplate(template: SmsTemplate) {
    if (confirm(`Удалить шаблон "${template.name}"?`)) {
      this.smsTemplateService.delete(template.id).subscribe({
        next: () => {
          this.snackBar.open('Шаблон удален', 'Закрыть', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Ошибка удаления шаблона', 'Закрыть', { duration: 3000 });
        }
      });
    }
  }
}
