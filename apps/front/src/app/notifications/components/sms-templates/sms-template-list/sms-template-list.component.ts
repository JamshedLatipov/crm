import { Component, OnInit, signal, ViewChild, TemplateRef, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn } from '../../../../shared/components/crm-table/crm-table.component';
import { SmsTemplateService } from '../../../services/sms-template.service';
import { SmsTemplate } from '../../../models/notification.models';

@Component({
  selector: 'app-sms-template-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CrmTableComponent,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatSnackBarModule,
    PageLayoutComponent
  ],
  templateUrl: './sms-template-list.component.html',
  styleUrls: ['./sms-template-list.component.scss']
})
export class SmsTemplateListComponent implements OnInit, AfterViewInit {
  private readonly smsTemplateService = inject(SmsTemplateService);
  private readonly snackBar = inject(MatSnackBar);

  loading = this.smsTemplateService.isLoading;
  templates = this.smsTemplateService.templates;

  @ViewChild('contentTemplate') contentTemplate!: TemplateRef<any>;
  @ViewChild('variablesTemplate') variablesTemplate!: TemplateRef<any>;
  @ViewChild('statusTemplate') statusTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  columns: CrmColumn[] = [
    { key: 'name', label: 'Название', sortable: true },
    { key: 'content', label: 'Содержимое', template: 'contentTemplate' },
    { key: 'variables', label: 'Переменные', template: 'variablesTemplate' },
    { key: 'isActive', label: 'Статус', template: 'statusTemplate' },
    { key: 'actions', label: 'Действия', template: 'actionsTemplate' },
  ];

  get tableTemplates(): { [key: string]: TemplateRef<any> } {
    return {
      contentTemplate: this.contentTemplate,
      variablesTemplate: this.variablesTemplate,
      statusTemplate: this.statusTemplate,
      actionsTemplate: this.actionsTemplate,
    };
  }

  ngOnInit() {
    this.loadTemplates();
  }

  ngAfterViewInit() {
    // Templates are now available
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
