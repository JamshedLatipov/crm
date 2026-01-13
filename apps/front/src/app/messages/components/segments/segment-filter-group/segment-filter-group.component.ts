import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import {
  FilterGroup,
  FilterCondition,
  SegmentFilter,
  isFilterGroup,
} from '../../../../shared/models/segment.models';
import { SegmentFilterEditorComponent } from '../segment-filter-editor/segment-filter-editor.component';

@Component({
  selector: 'app-segment-filter-group',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatCardModule,
    MatChipsModule,
    MatSelectModule,
    SegmentFilterEditorComponent,
  ],
  template: `
    <div class="filter-group" [class.nested]="depth() > 0">
      <!-- Group Header -->
      <div class="group-header">
        <div class="group-info">
          <mat-icon class="group-icon">{{
            depth() === 0 ? 'filter_list' : 'folder'
          }}</mat-icon>
          <span class="group-label">{{
            depth() === 0 ? 'Корневая группа' : 'Вложенная группа'
          }}</span>
        </div>

        <div class="group-actions">
          <button
            mat-button
            color="primary"
            type="button"
            [matMenuTriggerFor]="addMenu"
          >
            <mat-icon>add</mat-icon>
            Добавить
          </button>

          <mat-menu #addMenu="matMenu">
            <button type="button" mat-menu-item (click)="addFilter()">
              <mat-icon>filter_alt</mat-icon>
              <span>Условие</span>
            </button>
            <button mat-menu-item (click)="addGroup()">
              <mat-icon>folder</mat-icon>
              <span>Группу</span>
            </button>
          </mat-menu>

          @if (depth() > 0) {
          <button
            type="button"
            mat-icon-button
            color="warn"
            (click)="deleteGroup.emit()"
          >
            <mat-icon>delete</mat-icon>
          </button>
          }
        </div>
      </div>

      <!-- Conditions List -->
      <div class="conditions-list">
        @if (group().conditions.length === 0) {
        <div class="no-conditions">
          <mat-icon>info</mat-icon>
          <p>Нет условий. Добавьте условие или группу.</p>
        </div>
        } 
        
        @for (filterCondition of group().conditions; track $index; let i = $index; let first = $first) {
        <div class="condition-container">
          <!-- Логический оператор (не для первого элемента) -->
          @if (!first) {
          <div class="logic-operator-selector">
            <mat-chip-listbox class="logic-chips">
              <mat-chip-option
                [selected]="filterCondition.logicOperator === 'AND'"
                (click)="toggleConditionLogic(i)"
                [highlighted]="filterCondition.logicOperator === 'AND'"
              >
                AND
              </mat-chip-option>
              <mat-chip-option
                [selected]="filterCondition.logicOperator === 'OR'"
                (click)="toggleConditionLogic(i)"
                [highlighted]="filterCondition.logicOperator === 'OR'"
              >
                OR
              </mat-chip-option>
            </mat-chip-listbox>
            <span class="logic-description">
              {{
                filterCondition.logicOperator === 'AND'
                  ? 'И выполняется'
                  : 'ИЛИ выполняется'
              }}
            </span>
          </div>
          }

          <!-- Условие или группа -->
          <div class="condition-wrapper">
            @if (isFilterGroup(filterCondition.item)) {
            <!-- Nested Group -->
            <app-segment-filter-group
              [group]="filterCondition.item"
              [depth]="depth() + 1"
              (groupChange)="updateConditionItem(i, $event)"
              (deleteGroup)="deleteCondition(i)"
            >
            </app-segment-filter-group>
            } @else {
            <!-- Filter -->
            <div class="filter-item">
              <app-segment-filter-editor
                [filter]="filterCondition.item"
                (filterChange)="updateConditionItem(i, $event)"
                (delete)="deleteCondition(i)"
              >
              </app-segment-filter-editor>
            </div>
            }
          </div>
        </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .filter-group {
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        padding: 14px;
        background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        &.nested {
          margin: 8px 0;
          background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
          border-color: #bdbdbd;
          border-width: 2px;
          padding: 12px;
        }
      }

      .group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        gap: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e8e8e8;
      }

      .group-info {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;

        .group-icon {
          color: #1976d2;
          font-size: 22px;
          width: 22px;
          height: 22px;
        }

        .group-label {
          font-weight: 600;
          font-size: 14px;
          color: rgba(0, 0, 0, 0.87);
          letter-spacing: 0.3px;
        }
      }

      .group-actions {
        display: flex;
        gap: 6px;
        align-items: center;

        button[mat-button] {
          border-radius: 8px;
          font-weight: 500;
          font-size: 13px;
          padding: 0 12px;
          height: 36px;

          mat-icon {
            margin-right: 4px;
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }

        button[mat-icon-button] {
          transition: all 0.2s ease;
          width: 36px;
          height: 36px;

          mat-icon {
            font-size: 20px;
          }

          &:hover {
            transform: scale(1.1);
          }
        }
      }

      .conditions-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .no-conditions {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 24px 20px;
        background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%);
        border: 2px dashed #d0d0d0;
        border-radius: 10px;
        color: rgba(0, 0, 0, 0.6);
        transition: all 0.2s ease;

        &:hover {
          border-color: #b0b0b0;
          background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
        }

        mat-icon {
          color: #9e9e9e;
          font-size: 28px;
          width: 28px;
          height: 28px;
        }

        p {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
        }
      }

      .condition-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .logic-operator-selector {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: linear-gradient(90deg, #e3f2fd 0%, #f3f8fe 100%);
        border-left: 3px solid #1976d2;
        box-shadow: 0 1px 3px rgba(25, 118, 210, 0.1);
        transition: all 0.2s ease;

        &:hover {
          box-shadow: 0 2px 6px rgba(25, 118, 210, 0.15);
        }

        .logic-chips {
          display: flex;
          gap: 6px;

          mat-chip-option {
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 0 10px;
            height: 28px;

            &[selected='true'] {
              background-color: #1976d2;
              color: white;
              box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3);
              transform: scale(1.05);
            }

            &:not([selected='true']) {
              background-color: #fff;
              color: #1976d2;
            }

            &:hover {
              opacity: 0.9;
              transform: scale(1.05);
            }
          }
        }

        .logic-description {
          font-size: 13px;
          color: rgba(0, 0, 0, 0.75);
          font-style: italic;
          font-weight: 500;
        }
      }

      .condition-wrapper {
        position: relative;
      }

      .filter-item {
        background-color: #ffffff;
        border-radius: 8px;
        padding: 12px;
        border: 1px solid #e8e8e8;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        transition: all 0.2s ease;

        &:hover {
          border-color: #1976d2;
          box-shadow: 0 2px 6px rgba(25, 118, 210, 0.1);
        }
      }

      /* Responsive design */
      @media (max-width: 768px) {
        .filter-group {
          padding: 12px;
        }

        .group-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }

        .group-actions {
          width: 100%;
          justify-content: space-between;
        }

        .logic-operator-selector {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 12px;
        }
      }
    `,
  ],
})
export class SegmentFilterGroupComponent {
  // Inputs
  readonly group = input.required<FilterGroup>();
  readonly depth = input<number>(0);

  // Outputs
  readonly groupChange = output<FilterGroup>();
  readonly deleteGroup = output<void>();

  // Helper
  readonly isFilterGroup = isFilterGroup;

  addFilter(): void {
    const newFilter: SegmentFilter = {
      field: 'name',
      operator: 'contains',
      value: '',
    };

    const newCondition: FilterCondition = {
      item: newFilter,
      logicOperator: 'AND', // По умолчанию AND
    };

    const updatedGroup: FilterGroup = {
      ...this.group(),
      conditions: [...this.group().conditions, newCondition],
    };
    this.groupChange.emit(updatedGroup);
  }

  addGroup(): void {
    const newGroup: FilterGroup = {
      conditions: [],
    };

    const newCondition: FilterCondition = {
      item: newGroup,
      logicOperator: 'AND', // По умолчанию AND
    };

    const updatedGroup: FilterGroup = {
      ...this.group(),
      conditions: [...this.group().conditions, newCondition],
    };
    this.groupChange.emit(updatedGroup);
  }

  updateConditionItem(index: number, item: SegmentFilter | FilterGroup): void {
    const updatedConditions = [...this.group().conditions];
    updatedConditions[index] = {
      ...updatedConditions[index],
      item: item,
    };

    const updatedGroup: FilterGroup = {
      ...this.group(),
      conditions: updatedConditions,
    };
    this.groupChange.emit(updatedGroup);
  }

  toggleConditionLogic(index: number): void {
    const updatedConditions = [...this.group().conditions];
    const currentLogic = updatedConditions[index].logicOperator;
    updatedConditions[index] = {
      ...updatedConditions[index],
      logicOperator: currentLogic === 'AND' ? 'OR' : 'AND',
    };

    const updatedGroup: FilterGroup = {
      ...this.group(),
      conditions: updatedConditions,
    };
    this.groupChange.emit(updatedGroup);
  }

  deleteCondition(index: number): void {
    const updatedConditions = this.group().conditions.filter(
      (_, i) => i !== index
    );

    const updatedGroup: FilterGroup = {
      ...this.group(),
      conditions: updatedConditions,
    };
    this.groupChange.emit(updatedGroup);
  }
}
