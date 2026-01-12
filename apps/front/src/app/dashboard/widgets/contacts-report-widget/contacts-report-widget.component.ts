import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ReportsService, ContactsReportData } from '../../../services/reports.service';
import { CustomFieldsService } from '../../../services/custom-fields.service';
import { CustomFieldDefinition } from '../../../models/custom-field.model';

@Component({
  selector: 'app-contacts-report-widget',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatIconModule,
    FormsModule
  ],
  templateUrl: './contacts-report-widget.component.html',
  styleUrls: ['./contacts-report-widget.component.scss']
})
export class ContactsReportWidgetComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly customFieldsService = inject(CustomFieldsService);

  loading = true;
  reportData = signal<ContactsReportData | null>(null);
  customFieldDefinitions = signal<CustomFieldDefinition[]>([]);
  selectedGroupField: string | null = null;

  ngOnInit(): void {
    this.loadCustomFields();
    this.loadReport();
  }

  loadCustomFields(): void {
    this.customFieldsService.findByEntity('contact').subscribe({
      next: (fields) => this.customFieldDefinitions.set(fields),
      error: (err) => console.error('Failed to load custom fields:', err)
    });
  }

  loadReport(): void {
    this.loading = true;
    this.reportsService.contactsReport(this.selectedGroupField || undefined).subscribe({
      next: (data) => {
        this.reportData.set(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load contacts report:', err);
        this.loading = false;
      }
    });
  }

  onGroupFieldChange(): void {
    this.loadReport();
  }

  getGroupedDataArray(): Array<{key: string, value: number}> {
    const data = this.reportData();
    if (!data?.groupedData) return [];
    
    return Object.entries(data.groupedData)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }

  getTypeDataArray(): Array<{key: string, value: number}> {
    const data = this.reportData();
    if (!data?.byType) return [];
    
    return Object.entries(data.byType)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'person': 'Физическое лицо',
      'company': 'Компания',
      'unknown': 'Не указано'
    };
    return labels[type] || type;
  }

  getFieldLabel(fieldName: string): string {
    const definition = this.customFieldDefinitions().find(f => f.name === fieldName);
    return definition?.label || fieldName;
  }
}
