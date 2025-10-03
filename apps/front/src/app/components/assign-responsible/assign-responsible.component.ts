import { Component, inject, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, startWith, map } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  department?: string;
}

export interface AssignmentData {
  assignedTo: string[];
  assignedBy: string;
  assignedAt: Date;
  reason?: string;
}

@Component({
  selector: 'app-assign-responsible',
  standalone: true,
  imports: [
    CommonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatAutocompleteModule,
    ReactiveFormsModule
  ],
  templateUrl: './assign-responsible.component.html',
  styleUrls: ['./assign-responsible.component.scss']
})
export class AssignResponsibleComponent {
  // Inputs
  public readonly entityType = input<'lead' | 'deal' | 'task' | 'notification'>('notification');
  public readonly entityId = input<string | number>();
  public readonly currentAssignees = input<string[]>([]);

  // Outputs
  public readonly assigned = output<AssignmentData>();
  public readonly cancelled = output<void>();

  // Form controls
  public readonly searchControl = new FormControl('');
  public readonly reasonControl = new FormControl('');

  // State
  public readonly selectedUsers = signal<User[]>([]);
  public readonly availableUsers = signal<User[]>([
    // Mock data - в реальном приложении загружать через сервис
    { id: '1', name: 'Анна Иванова', email: 'anna@company.com', role: 'Менеджер', department: 'Продажи' },
    { id: '2', name: 'Петр Петров', email: 'petr@company.com', role: 'Администратор', department: 'IT' },
    { id: '3', name: 'Елена Сидорова', email: 'elena@company.com', role: 'Поддержка', department: 'Клиентский сервис' },
    { id: '4', name: 'Сергей Козлов', email: 'sergey@company.com', role: 'Менеджер', department: 'Продажи' },
    { id: '5', name: 'Мария Николаева', email: 'maria@company.com', role: 'Руководитель', department: 'Продажи' }
  ]);

  // Computed
  public readonly filteredUsers$: Observable<User[]>;

  constructor() {
    this.filteredUsers$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      map(value => this.filterUsers(value || ''))
    );

    // Предустановленные назначения
    const currentIds = this.currentAssignees();
    if (currentIds.length > 0) {
      const preselected = this.availableUsers().filter(user => 
        currentIds.includes(user.id)
      );
      this.selectedUsers.set(preselected);
    }
  }

  onUserSelected(event: any): void {
    const userId = event.option.value;
    const user = this.availableUsers().find(u => u.id === userId);
    
    if (user && !this.selectedUsers().find(u => u.id === userId)) {
      this.selectedUsers.update(users => [...users, user]);
    }
    
    this.searchControl.setValue('');
  }

  removeUser(userId: string): void {
    this.selectedUsers.update(users => users.filter(u => u.id !== userId));
  }

  assignByRole(role: string): void {
    const roleUsers = this.availableUsers().filter(user => 
      user.role?.toLowerCase().includes(role) && 
      !this.selectedUsers().find(selected => selected.id === user.id)
    );
    
    this.selectedUsers.update(users => [...users, ...roleUsers]);
  }

  onAssign(): void {
    const assignmentData: AssignmentData = {
      assignedTo: this.selectedUsers().map(user => user.id),
      assignedBy: 'current-user', // Получать из AuthService
      assignedAt: new Date(),
      reason: this.reasonControl.value || undefined
    };

    this.assigned.emit(assignmentData);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private filterUsers(value: string): User[] {
    const filterValue = value.toLowerCase();
    return this.availableUsers().filter(user =>
      user.name.toLowerCase().includes(filterValue) ||
      user.email.toLowerCase().includes(filterValue) ||
      user.role?.toLowerCase().includes(filterValue)
    );
  }
}