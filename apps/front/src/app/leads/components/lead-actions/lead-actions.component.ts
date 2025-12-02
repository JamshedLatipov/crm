import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Lead } from '../../models/lead.model';

@Component({
  selector: 'app-lead-actions',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule, MatTooltipModule],
  templateUrl: './lead-actions.component.html',
  styleUrls: ['./lead-actions.component.scss']
})
export class LeadActionsComponent {
  @Input() lead!: Lead;
  @Input() layout: 'horizontal' | 'vertical' = 'horizontal';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() context: 'header' | 'card' | 'toolbar' = 'header';
  // Optional extra inputs to render assignee info nicely
  @Input() managers: Array<any> | undefined;
  @Input() assignments: Array<any> | undefined;

  @Output() editLead = new EventEmitter<void>();
  @Output() convertToDeal = new EventEmitter<void>();
  @Output() deleteLead = new EventEmitter<void>();
  @Output() assignLead = new EventEmitter<void>();
  @Output() changeStatus = new EventEmitter<void>();
  @Output() contactLead = new EventEmitter<void>();
  @Output() createPromo = new EventEmitter<void>();
  @Output() assignPromo = new EventEmitter<void>();

  onEditLead(): void {
    this.editLead.emit();
  }

  onConvertToDeal(): void {
    this.convertToDeal.emit();
  }

  onDeleteLead(): void {
    this.deleteLead.emit();
  }

  onAssignLead(): void {
    this.assignLead.emit();
  }

  // ----- Assignee helpers (copied/adapted from lead-detail) -----
  private getActiveAssignment(): any | undefined {
    if (!this.assignments || this.assignments.length === 0) return undefined;
    const active = this.assignments.find((a: any) => a.status === 'active');
    return active || this.assignments[0];
  }

  getAssigneeName(): string {
    const active = this.getActiveAssignment();
    if (!active) return 'Не назначен';
    const manager = this.managers?.find((m: any) => m.id?.toString() === active.userId?.toString());
    return manager?.fullName || manager?.username || (active as any).userName || `ID: ${active.userId}`;
  }
  getAssigneeWorkload(): string | undefined {
    const active = this.getActiveAssignment();
    return (active as any)?.workload;
  }

  getAssigneeEmail(): string | undefined {
    const active = this.getActiveAssignment();
    const manager = this.managers?.find((m: any) => m.id?.toString() === active?.userId?.toString());
    return manager?.email || (active as any)?.userEmail;
  }

  onChangeStatus(): void {
    this.changeStatus.emit();
  }

  onContactLead(): void {
    this.contactLead.emit();
  }

  onCreatePromo(): void {
    this.createPromo.emit();
  }

  onAssignPromo(): void {
    this.assignPromo.emit();
  }

  getButtonClass(): string {
    return `action-btn ${this.context}-context size-${this.size}`;
  }

  isConvertDisabled(): boolean {
    return this.lead?.status === 'converted';
  }
}