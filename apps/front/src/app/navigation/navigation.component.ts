import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule
  ],
  template: `
    <mat-toolbar color="primary">
      <span>CRM System</span>
      
      <div class="nav-spacer"></div>
      
      <nav class="nav-menu">
        <button mat-button routerLink="/leads" routerLinkActive="active">
          <mat-icon>people</mat-icon>
          Лиды
        </button>
        
        <button mat-button routerLink="/softphone" routerLinkActive="active">
          <mat-icon>phone</mat-icon>
          Софтфон
        </button>
        
        <button mat-button routerLink="/ivr" routerLinkActive="active">
          <mat-icon>settings_phone</mat-icon>
          IVR
        </button>
      </nav>
      
      <div class="nav-spacer"></div>
      
      <button mat-icon-button [matMenuTriggerFor]="userMenu">
        <mat-icon>account_circle</mat-icon>
      </button>
      
      <mat-menu #userMenu="matMenu">
        <button mat-menu-item (click)="logout()">
          <mat-icon>exit_to_app</mat-icon>
          Выйти
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .nav-spacer {
      flex: 1 1 auto;
    }
    
    .nav-menu {
      display: flex;
      gap: 8px;
    }
    
    .nav-menu button {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .nav-menu button.active {
      background-color: rgba(255, 255, 255, 0.1);
    }
  `]
})
export class NavigationComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
