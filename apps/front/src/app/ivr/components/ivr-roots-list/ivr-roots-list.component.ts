import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IvrNodeDto } from '../../ivr.service';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-ivr-roots-list',
  standalone: true,
  imports: [CommonModule, DragDropModule, MatIconModule, MatTooltipModule, MatButtonModule],
  templateUrl: './ivr-roots-list.component.html',
  styleUrls: ['./ivr-roots-list.component.scss'],
})
export class IvrRootsListComponent {
  @Input() roots: IvrNodeDto[] = [];
  @Input() selectedId?: string;
  @Input() actionLabels: Record<string, string> = {};

  @Output() select = new EventEmitter<IvrNodeDto>();
  @Output() edit = new EventEmitter<IvrNodeDto>();
  @Output() delete = new EventEmitter<IvrNodeDto>();
  @Output() reorder = new EventEmitter<IvrNodeDto[]>();
  @Output() createFirst = new EventEmitter<void>();

  onSelect(n: IvrNodeDto) {
    this.select.emit(n);
  }

  onEdit(n: IvrNodeDto, ev?: MouseEvent) {
    ev?.stopPropagation();
    this.edit.emit(n);
  }

  onDelete(n: IvrNodeDto, ev?: MouseEvent) {
    ev?.stopPropagation();
    this.delete.emit(n);
  }

  drop(ev: CdkDragDrop<IvrNodeDto[]>) {
    const arr = [...this.roots];
    moveItemInArray(arr, ev.previousIndex, ev.currentIndex);
    arr.forEach((n, idx) => (n.order = idx));
    this.reorder.emit(arr);
  }
}
