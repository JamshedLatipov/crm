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
import { CrmTableComponent, CrmColumn, CrmColumnTemplateDirective } from '../../../../shared/components/crm-table/crm-table.component';
import { TelegramTemplateService } from '../../../services/telegram-template.service';
import { TelegramTemplate } from '../../../models/message.models';

@Component({
  selector: 'app-telegram-template-list',
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
  templateUrl: './telegram-template-list.component.html',
  styleUrl: './telegram-template-list.component.scss'
})
export class TelegramTemplateListComponent implements OnInit {
  private readonly telegramTemplateService = inject(TelegramTemplateService);
  private readonly snackBar = inject(MatSnackBar);

  loading = this.telegramTemplateService.isLoading;
  templates = this.telegramTemplateService.templates;

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
    this.telegramTemplateService.getAll().subscribe({
      error: () => {
        this.snackBar.open('Ошибка загрузки шаблонов', 'Закрыть', { duration: 3000 });
      }
    });
  }

  deleteTemplate(template: TelegramTemplate) {
    if (confirm(`Удалить шаблон "${template.name}"?`)) {
      this.telegramTemplateService.delete(template.id).subscribe({
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
}
