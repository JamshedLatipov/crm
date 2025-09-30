import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="user-avatar" 
      [class.small]="size === 'small'"
      [class.medium]="size === 'medium'"
      [class.large]="size === 'large'"
      [style.background-color]="backgroundColor"
      [title]="fullName"
    >
      <span class="initials">{{ initials }}</span>
    </div>
  `,
  styleUrls: ['./user-avatar.component.scss']
})
export class UserAvatarComponent {
  @Input() fullName = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  get initials(): string {
    if (!this.fullName) return '?';
    
    const names = this.fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
  }

  get backgroundColor(): string {
    // Генерируем цвет на основе имени для консистентности
    const colors = [
      '#4285f4', '#34a853', '#fbbc04', '#ea4335', '#9c27b0',
      '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
      '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
      '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b'
    ];
    
    if (!this.fullName) return colors[0];
    
    let hash = 0;
    for (let i = 0; i < this.fullName.length; i++) {
      hash = this.fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
}