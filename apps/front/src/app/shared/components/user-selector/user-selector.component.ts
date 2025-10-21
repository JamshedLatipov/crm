import { Component, Input, Output, EventEmitter, OnInit, forwardRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsersService, User } from '../../../users/users.service';
import { roleDisplay, departmentDisplay } from '../../utils';

@Component({
  selector: 'app-user-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UserSelectorComponent),
      multi: true
    }
  ],
  templateUrl: './user-selector.component.html',
  styleUrls: ['./user-selector.component.scss']
})
export class UserSelectorComponent implements OnInit, ControlValueAccessor {
  @Input() label = 'Ответственный';
  @Input() placeholder = '-- Выберите ответственного --';
  @Input() required = false;
  @Input() appearance: 'fill' | 'outline' = 'outline';
  @Input() showEmail = false;  // По умолчанию скрыт для компактности
  @Input() showStatus = false; // По умолчанию скрыт для компактности
  @Input() showDepartment = true;
  @Input() showRole = true;
  @Input() icon = 'person_pin';
  @Input() errorMessage = 'Выберите пользователя';
  
  availableUsers: User[] = [];
  isLoading = false;
  isDisabled = false;
  selectedUser: User | null = null;
  
  value: string | number | null = null;
  
  // ControlValueAccessor callbacks
  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  constructor(
    private usersService: UsersService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  private loadUsers() {
    this.isLoading = true;
    this.usersService.getAllManagers().subscribe({
      next: (users) => {
        this.availableUsers = users;
        this.isLoading = false;
        
        // Update selectedUser if value is already set (и не null/undefined)
        if (this.value !== null && this.value !== undefined && this.value !== '') {
          this.updateSelectedUser(this.value);
          
          // Принудительно запускаем Change Detection
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        } else {
          console.log('UserSelector: Skipping updateSelectedUser because value is empty');
        }
      },
      error: (error) => {
        console.error('Ошибка загрузки пользователей:', error);
        this.isLoading = false;
      }
    });
  }

  private updateSelectedUser(userId: string | number | null) {
    console.log('UserSelector: updateSelectedUser called with:', userId, 'type:', typeof userId);
    console.log('UserSelector: availableUsers:', this.availableUsers.map(u => ({id: u.id, name: u.name})));
    
    if (userId === null || userId === undefined || userId === '') {
      this.selectedUser = null;
      console.log('UserSelector: selectedUser set to null (empty value)');
    } else {
      const stringId = String(userId);
      console.log('UserSelector: Looking for user with stringId:', stringId);
      
      this.selectedUser = this.availableUsers.find(u => String(u.id) === stringId) || null;
      this.value = this.selectedUser ? this.selectedUser.id : null;
      
      if (!this.selectedUser && this.availableUsers.length === 0) {
        console.log('UserSelector: Список пользователей ещё не загружен, значение будет установлено после загрузки');
      }
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    // Нормализуем undefined и пустую строку в null
    const normalizedValue = (value === undefined || value === '') ? null : value;
    this.value = normalizedValue;
    
    // Обновляем selectedUser независимо от того, загружены ли пользователи
    if (this.availableUsers.length > 0) {
      this.updateSelectedUser(normalizedValue);
      this.cdr.markForCheck();
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  onValueChange(value: any) {
    this.value = value;
    this.updateSelectedUser(value);
    this.onChange(value);
    this.onTouched();
  }

  // Используем утилиты для преобразования
  roleDisplay = roleDisplay;
  departmentDisplay = departmentDisplay;
}
