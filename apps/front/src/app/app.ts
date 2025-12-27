import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SoftphoneComponent } from './softphone/softphone.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { AuthService } from './auth/auth.service';
import { WebSocketService } from './services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  imports: [RouterModule, SoftphoneComponent, SidebarComponent, MatSnackBarModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private wsService = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);
  private sub: Subscription | undefined;

  ngOnInit() {
    // If user is already logged in, connect
    const token = this.authService.getToken();
    if (token) {
      this.wsService.connect(token);
    }

    // Subscribe to notifications
    this.sub = this.wsService.notifications$.subscribe(notification => {
      this.showNotification(notification);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.wsService.disconnect();
  }

  private showNotification(notification: any) {
    this.snackBar.open(notification.title + ': ' + notification.message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}