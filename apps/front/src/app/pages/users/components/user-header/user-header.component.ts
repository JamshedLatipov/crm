import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { User } from '../../../../services/user-management.service';

@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './user-header.component.html',
  styleUrls: ['./user-header.component.scss']
})
export class UserHeaderComponent {
  @Input() user: User | null = null;
  @Output() edit = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  getInitials(user: User): string {
    const firstInitial = user.firstName?.charAt(0).toUpperCase() || '';
    const lastInitial = user.lastName?.charAt(0).toUpperCase() || '';
    return firstInitial + lastInitial || user.username?.charAt(0).toUpperCase() || '?';
  }

  getStatusBadgeClass(user: User): string {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    return user.isActive
      ? `${baseClasses} bg-green-100 text-green-800`
      : `${baseClasses} bg-red-100 text-red-800`;
  }
}
