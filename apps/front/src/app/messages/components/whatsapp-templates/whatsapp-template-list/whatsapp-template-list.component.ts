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
import { WhatsAppTemplateService } from '../../../services/whatsapp-template.service';
import { WhatsAppTemplate } from '../../../models/message.models';

@Component({
  selector: 'app-whatsapp-template-list',
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
  templateUrl: './whatsapp-template-list.component.html',
  styleUrl: './whatsapp-template-list.component.scss'
})
export class WhatsAppTemplateListComponent implements OnInit {
  private readonly whatsappTemplateService = inject(WhatsAppTemplateService);
  private readonly snackBar = inject(MatSnackBar);

  loading = this.whatsappTemplateService.isLoading;
  templates = this.whatsappTemplateService.templates;

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
    this.whatsappTemplateService.getAll().subscribe({
      error: () => {
        this.snackBar.open('Ошибка загрузки шаблонов', 'Закрыть', { duration: 3000 });
      }
    });
  }

  deleteTemplate(template: WhatsAppTemplate) {
    if (confirm(`Удалить шаблон "${template.name}"?`)) {
      this.whatsappTemplateService.delete(template.id).subscribe({
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
