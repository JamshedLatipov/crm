import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    MatCardModule,
    MatChipsModule,
    MatSelectModule,
    SegmentFilterEditorComponent,
  ],
  templateUrl: './segment-filter-group.component.html',
  styleUrls: ['./segment-filter-group.component.scss']
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
