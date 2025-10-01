import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-password-reset-snackbar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="flex items-center gap-3">
      <span class="text-sm">Временный пароль: <strong>{{ data.password }}</strong></span>
      <button
        mat-icon-button
        (click)="copyPassword()"
        class="text-primary hover:text-primary-dark"
        title="Копировать пароль">
        <mat-icon>content_copy</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      max-width: none;
    }
    .text-primary { color: #1976d2; }
    .text-primary-dark { color: #1565c0; }
  `]
})
export class PasswordResetSnackbarComponent {
  private readonly snackBarRef = inject(MatSnackBarRef<PasswordResetSnackbarComponent>);
  public readonly data = inject(MAT_SNACK_BAR_DATA) as { password: string };

  async copyPassword(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.data.password);
      // Показываем кратковременное уведомление об успешном копировании
      this.snackBarRef.dismiss();
    } catch (error) {
      console.error('Failed to copy password:', error);
    }
  }
}