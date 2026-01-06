import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../../shared/components/crm-table/crm-table.component';
import { EmailTemplateService } from '../../../services/email-template.service';
import { EmailTemplate } from '../../../models/message.models';

@Component({
  selector: 'app-email-template-list',
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
    PageLayoutComponent
  ],
  templateUrl: './email-template-list.component.html',
  styleUrl: './email-template-list.component.scss'
})
export class EmailTemplateListComponent implements OnInit {
  private readonly emailTemplateService = inject(EmailTemplateService);
  private readonly snackBar = inject(MatSnackBar);

  templates = signal<EmailTemplate[]>([]);
  loading = signal<boolean>(false);

  columns: CrmColumn[] = [
    { key: 'name', label: 'Название', sortable: true },
    { key: 'subject', label: 'Тема письма', template: 'subjectTemplate' },
    { key: 'variables', label: 'Переменные', template: 'variablesTemplate' },
    { key: 'isActive', label: 'Статус', template: 'statusTemplate' },
    { key: 'actions', label: 'Действия', template: 'actionsTemplate' },
  ];

  ngOnInit() {
    this.loadTemplates();
  }

  loadTemplates() {
    this.loading.set(true);
    this.emailTemplateService.getAll().subscribe({
      next: (response) => {
        this.templates.set(response.data);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Ошибка загрузки шаблонов', 'Закрыть', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  deleteTemplate(template: EmailTemplate) {
    if (confirm(`Удалить шаблон "${template.name}"?`)) {
      this.emailTemplateService.delete(template.id).subscribe({
        next: () => {
          this.snackBar.open('Шаблон удален', 'Закрыть', { duration: 3000 });
          this.loadTemplates();
        },
        error: () => {
          this.snackBar.open('Ошибка удаления шаблона', 'Закрыть', { duration: 3000 });
        }
      });
    }
  }

  duplicateTemplate(template: EmailTemplate) {
    this.emailTemplateService.duplicate(template.id).subscribe({
      next: () => {
        this.snackBar.open('Шаблон скопирован', 'Закрыть', { duration: 3000 });
        this.loadTemplates();
      },
      error: () => {
        this.snackBar.open('Ошибка копирования шаблона', 'Закрыть', { duration: 3000 });
      }
    });
  }

  sendTestEmail(template: EmailTemplate) {
    // TODO: Реализовать диалог для ввода email и переменных
    this.snackBar.open('Функция в разработке', 'Закрыть', { duration: 3000 });
  }
}
