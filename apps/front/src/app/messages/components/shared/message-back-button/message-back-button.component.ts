import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-message-back-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="breadcrumb">
      <button mat-button (click)="goBack()" class="breadcrumb-link">
        <mat-icon>arrow_back</mat-icon>
        <span>Назад</span>
      </button>
    </div>
  `,
  styleUrls: ['./message-back-button.component.scss'],
})
export class MessageBackButtonComponent {
  private router = inject(Router);

  goBack() {
    this.router.navigate(['/messages']);
  }
}
