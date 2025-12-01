import { Component, inject, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { IntegrationService, IntegrationConfig } from '../../integrations/services/integration.service';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { CrmTableComponent, CrmColumn } from '../../shared/components/crm-table/crm-table.component';
import { IntegrationConfigDialogComponent } from './dialogs/integration-config-dialog/integration-config-dialog.component';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    CrmTableComponent,
    MatSlideToggleModule,
    MatPaginatorModule,
    PageLayoutComponent
  ],
  templateUrl: './integrations.component.html',
  styleUrls: ['./integrations.component.scss']
})
export class IntegrationsComponent {
  private service = inject(IntegrationService);
  private dialog = inject(MatDialog);
  
  configs = signal<IntegrationConfig[]>([]);
  displayedColumns = ['name', 'isActive', 'sources', 'actions'];

  // Columns for crm-table
  columns: CrmColumn[] = [
    { key: 'name', label: 'Название' },
    { key: 'isActive', label: 'Активно', template: 'isActiveTemplate' },
    { key: 'sources', label: 'Источники', template: 'sourcesTemplate' },
    { key: 'actions', label: 'Действия', template: 'actionsTemplate' },
  ];

  @ViewChild('isActiveTemplate') isActiveTemplate!: TemplateRef<any>;
  @ViewChild('sourcesTemplate') sourcesTemplate!: TemplateRef<any>;
  @ViewChild('actionsTemplate') actionsTemplate!: TemplateRef<any>;

  get tableTemplates(): { [key: string]: TemplateRef<any> } {
    return {
      isActiveTemplate: this.isActiveTemplate,
      sourcesTemplate: this.sourcesTemplate,
      actionsTemplate: this.actionsTemplate,
    };
  }

  constructor() {
    this.loadConfigs();
  }

  loadConfigs() {
    this.service.getConfigs().subscribe(data => {
      this.configs.set(data);
    });
  }

  toggleActive(config: IntegrationConfig) {
    const updated = { ...config, isActive: !config.isActive };
    this.service.saveConfig(updated).subscribe(() => {
      this.loadConfigs();
    });
  }

  editConfig(config: IntegrationConfig) {
    this.openDialog(config);
  }

  createConfig() {
    this.openDialog();
  }

  private openDialog(config?: IntegrationConfig) {
    const dialogRef = this.dialog.open(IntegrationConfigDialogComponent, {
      width: '800px',
      data: config || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.service.saveConfig(result).subscribe(() => {
          this.loadConfigs();
        });
      }
    });
  }
}
