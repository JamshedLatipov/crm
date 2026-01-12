import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CustomFieldsService } from '../../../services/custom-fields.service';
import {
  CustomFieldDefinition,
  EntityType,
} from '../../../models/custom-field.model';
import { CustomFieldEditorDialogComponent } from './custom-field-editor-dialog.component';

@Component({
  selector: 'app-custom-fields',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatTabsModule,
    DragDropModule,
  ],
  templateUrl: './custom-fields.component.html',
  styleUrls: ['./custom-fields.component.scss'],
})
export class CustomFieldsComponent implements OnInit {
  private readonly customFieldsService = inject(CustomFieldsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  fields = signal<CustomFieldDefinition[]>([]);
  loading = signal(false);
  selectedEntityType = signal<EntityType>('contact');

  displayedColumns = [
    'drag',
    'label',
    'name',
    'fieldType',
    'isActive',
    'actions',
  ];

  entityTypes: EntityType[] = ['contact', 'lead', 'deal', 'company'];

  ngOnInit(): void {
    this.loadFields();
  }

  onEntityTypeChange(entityType: EntityType): void {
    this.selectedEntityType.set(entityType);
    this.loadFields();
  }

  loadFields(): void {
    this.loading.set(true);
    this.customFieldsService
      .findByEntity(this.selectedEntityType())
      .subscribe({
        next: (fields) => {
          this.fields.set(fields);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading custom fields:', error);
          this.snackBar.open('Ошибка загрузки полей', 'OK', {
            duration: 3000,
          });
          this.loading.set(false);
        },
      });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CustomFieldEditorDialogComponent, {
      width: '700px',
      data: { entityType: this.selectedEntityType() },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadFields();
        this.snackBar.open('Поле успешно создано', 'OK', { duration: 3000 });
      }
    });
  }

  openEditDialog(field: CustomFieldDefinition): void {
    const dialogRef = this.dialog.open(CustomFieldEditorDialogComponent, {
      width: '700px',
      data: { field, entityType: this.selectedEntityType() },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadFields();
        this.snackBar.open('Поле успешно обновлено', 'OK', { duration: 3000 });
      }
    });
  }

  deleteField(field: CustomFieldDefinition): void {
    if (
      confirm(
        `Вы уверены, что хотите удалить поле "${field.label}"? Это действие необратимо.`
      )
    ) {
      this.customFieldsService.remove(field.id).subscribe({
        next: () => {
          this.loadFields();
          this.snackBar.open('Поле успешно удалено', 'OK', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting field:', error);
          this.snackBar.open('Ошибка при удалении поля', 'OK', {
            duration: 3000,
          });
        },
      });
    }
  }

  toggleActive(field: CustomFieldDefinition): void {
    this.customFieldsService
      .update(field.id, { isActive: !field.isActive })
      .subscribe({
        next: () => {
          this.loadFields();
          this.snackBar.open(
            `Поле ${field.isActive ? 'деактивировано' : 'активировано'}`,
            'OK',
            { duration: 3000 }
          );
        },
        error: (error) => {
          console.error('Error toggling field status:', error);
          this.snackBar.open('Ошибка изменения статуса', 'OK', {
            duration: 3000,
          });
        },
      });
  }

  drop(event: CdkDragDrop<CustomFieldDefinition[]>): void {
    const items = [...this.fields()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);

    // Update sort order
    const updates = items.map((field, index) => ({
      id: field.id,
      sortOrder: index,
    }));

    this.customFieldsService.updateSortOrder(updates).subscribe({
      next: () => {
        this.fields.set(items);
        this.snackBar.open('Порядок полей обновлен', 'OK', { duration: 2000 });
      },
      error: (error) => {
        console.error('Error updating sort order:', error);
        this.snackBar.open('Ошибка обновления порядка', 'OK', {
          duration: 3000,
        });
      },
    });
  }

  getFieldTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      text: 'Текст',
      number: 'Число',
      date: 'Дата',
      boolean: 'Да/Нет',
      select: 'Выбор',
      multiselect: 'Множественный выбор',
      email: 'Email',
      phone: 'Телефон',
      url: 'URL',
      textarea: 'Многострочный текст',
    };
    return labels[type] || type;
  }
}
