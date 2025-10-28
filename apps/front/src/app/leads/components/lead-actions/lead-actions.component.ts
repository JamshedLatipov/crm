import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Lead } from '../../models/lead.model';

@Component({
  selector: 'app-lead-actions',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  templateUrl: './lead-actions.component.html',
  styleUrls: ['./lead-actions.component.scss']
})
export class LeadActionsComponent {
  @Input() lead!: Lead;
  @Input() layout: 'horizontal' | 'vertical' = 'horizontal';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() context: 'header' | 'card' | 'toolbar' = 'header';

  @Output() editLead = new EventEmitter<void>();
  @Output() convertToDeal = new EventEmitter<void>();
  @Output() deleteLead = new EventEmitter<void>();
  @Output() assignLead = new EventEmitter<void>();
  @Output() changeStatus = new EventEmitter<void>();
  @Output() contactLead = new EventEmitter<void>();
  @Output() createPromo = new EventEmitter<void>();

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

  onChangeStatus(): void {
    this.changeStatus.emit();
  }

  onContactLead(): void {
    this.contactLead.emit();
  }

  onCreatePromo(): void {
    this.createPromo.emit();
  }

  getButtonClass(): string {
    return `action-btn ${this.context}-context size-${this.size}`;
  }

  isConvertDisabled(): boolean {
    return this.lead?.status === 'converted';
  }
}