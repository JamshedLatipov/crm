import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Deal } from '../../../pipeline/dtos';

@Component({
  selector: 'app-deal-actions',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule, MatTooltipModule],
  templateUrl: './deal-actions.component.html',
  styleUrls: ['./deal-actions.component.scss']
})
export class DealActionsComponent {
  @Input() deal!: Deal | null;
  @Input() users: Array<any> | undefined;

  @Output() edit = new EventEmitter<void>();
  @Output() markWon = new EventEmitter<void>();
  @Output() changeAssignee = new EventEmitter<void>();

  onEdit() { this.edit.emit(); }
  onMarkWon() { this.markWon.emit(); }
  onChangeAssignee() { this.changeAssignee.emit(); }

  getAssignedName(): string {
    if (!this.deal || !this.deal.assignedTo) return 'Не назначен';
    const id = String(this.deal.assignedTo);
    const u = this.users?.find((x: any) => String(x.id) === id);
    return u?.name || `ID: ${id}`;
  }
}
