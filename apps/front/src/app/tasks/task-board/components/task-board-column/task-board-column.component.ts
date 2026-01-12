import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { TaskDto } from '../../../tasks.service';
import { TaskColumn } from '../../task-board.component';
import { TaskBoardCardComponent } from '../task-board-card/task-board-card.component';

@Component({
  selector: 'app-task-board-column',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    TaskBoardCardComponent,
  ],
  templateUrl: './task-board-column.component.html',
  styleUrls: ['./task-board-column.component.scss']
})
export class TaskBoardColumnComponent {
  @Input() column!: TaskColumn;
  @Input() connectedTo: string[] = [];
  
  @Output() drop = new EventEmitter<CdkDragDrop<TaskDto[]>>();
  @Output() taskClick = new EventEmitter<TaskDto>();
  @Output() taskEdit = new EventEmitter<TaskDto>();
  @Output() taskDelete = new EventEmitter<TaskDto>();

  onDrop(event: CdkDragDrop<TaskDto[]>): void {
    this.drop.emit(event);
  }

  onTaskClick(task: TaskDto): void {
    this.taskClick.emit(task);
  }

  onTaskEdit(task: TaskDto): void {
    this.taskEdit.emit(task);
  }

  onTaskDelete(task: TaskDto): void {
    this.taskDelete.emit(task);
  }
}
