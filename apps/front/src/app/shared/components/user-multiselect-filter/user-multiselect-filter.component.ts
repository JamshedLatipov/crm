import { Component, OnInit, signal, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsersService, User } from '../../../users/users.service';

@Component({
  selector: 'app-user-multiselect-filter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './user-multiselect-filter.component.html',
  styleUrls: ['./user-multiselect-filter.component.scss']
})
export class UserMultiselectFilterComponent implements OnInit {
  // Входные параметры
  label = input<string>('Исполнители');
  placeholder = input<string>('Начните вводить имя...');
  appearance = input<'outline' | 'fill'>('outline');
  
  // Выходные события
  selectionChange = output<Array<number | string>>();
  
  // Внутреннее состояние
  selectedUserIds = signal<Array<number | string>>([]);
  selectedUserObjects = signal<User[]>([]); // Храним объекты выбранных пользователей
  users = signal<User[]>([]);
  userSearchControl = new FormControl('');
  
  // Отфильтрованные пользователи (исключая уже выбранных)
  filteredUsers = computed(() => {
    const searchTerm = this.userSearchControl.value?.toLowerCase() || '';
    const allUsers = this.users();
    const selectedIds = this.selectedUserIds();
    
    let filtered = allUsers.filter(user => 
      user.id && !selectedIds.includes(user.id)
    );
    
    if (searchTerm) {
      filtered = filtered.filter(user => {
        const displayName = this.getUserDisplayName(user).toLowerCase();
        return displayName.includes(searchTerm);
      });
    }
    
    return filtered;
  });

  constructor(private usersService: UsersService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.usersService.getAllUsers().subscribe({
      next: (users) => {
        this.users.set(users);
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  onUserSelected(event: any): void {
    const user = event.option.value;
    
    if (user && user.id) {
      const currentIds = this.selectedUserIds();
      const currentObjects = this.selectedUserObjects();
      
      if (!currentIds.includes(user.id)) {
        const updatedIds = [...currentIds, user.id];
        const updatedObjects = [...currentObjects, user];
        
        this.selectedUserIds.set(updatedIds);
        this.selectedUserObjects.set(updatedObjects);
        this.selectionChange.emit(updatedIds);
      }
    }
    this.userSearchControl.setValue('', { emitEvent: false });
  }

  removeUser(userId: number | string): void {
    const currentIds = this.selectedUserIds();
    const currentObjects = this.selectedUserObjects();
    
    const updatedIds = currentIds.filter(id => id !== userId);
    const updatedObjects = currentObjects.filter(u => u.id !== userId);
    
    this.selectedUserIds.set(updatedIds);
    this.selectedUserObjects.set(updatedObjects);
    this.selectionChange.emit(updatedIds);
  }

  clearAll(event: Event): void {
    event.stopPropagation();
    this.selectedUserIds.set([]);
    this.selectedUserObjects.set([]);
    this.userSearchControl.setValue('');
    this.selectionChange.emit([]);
  }

  getUserById(userId: number | string): User | undefined {
    // Сначала ищем среди выбранных
    const selectedUser = this.selectedUserObjects().find(u => u.id === userId);
    if (selectedUser) return selectedUser;
    
    // Затем среди всех пользователей
    return this.users().find(u => u.id === userId);
  }

  getUserDisplayName(user: User | null): string {
    if (!user) return '';
    
    // Логируем пользователей с недостаточными данными для отладки
    if (!user.firstName && !user.lastName && !user.fullName && !user.name && !user.username && !user.email) {
      console.warn('Пользователь без имени и email:', {
        id: user.id,
        availableFields: Object.keys(user).filter(key => user[key as keyof User])
      });
    }
    
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.fullName) {
      return user.fullName;
    }
    if (user.name) {
      return user.name;
    }
    if (user.username) {
      return user.username;
    }
    if (user.email) {
      return user.email;
    }
    return user.id ? `Пользователь #${user.id}` : 'Неизвестный пользователь';
  }

  getInitials(user: User): string {
    if (!user) return '??';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user.name) {
      const parts = user.name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return '??';
  }

  // Метод для программной установки выбранных пользователей
  setSelectedUsers(userIds: Array<number | string>): void {
    this.selectedUserIds.set(userIds);
    
    // Находим объекты пользователей для выбранных ID
    const userObjects = userIds
      .map(id => this.users().find(u => u.id === id))
      .filter(u => u !== undefined) as User[];
    
    this.selectedUserObjects.set(userObjects);

    // Если не все пользователи найдены в текущем списке, перезагружаем список
    if (userObjects.length < userIds.length && this.users().length === 0) {
      // Список пользователей ещё не загружен, подождём загрузки
      const subscription = this.usersService.getAllUsers().subscribe({
        next: (users) => {
          this.users.set(users);
          // После загрузки находим всех пользователей
          const fullUserObjects = userIds
            .map(id => users.find(u => u.id === id))
            .filter(u => u !== undefined) as User[];
          this.selectedUserObjects.set(fullUserObjects);
        },
        error: (err) => {
          console.error('Error loading users for initialization:', err);
        }
      });
    }
  }

  // Метод для получения текущего выбора
  getSelectedUsers(): Array<number | string> {
    return this.selectedUserIds();
  }
}
