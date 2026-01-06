import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';

@Component({
  selector: 'app-telegram-preview',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    PageLayoutComponent
  ],
  templateUrl: './telegram-preview.component.html',
  styleUrl: './telegram-preview.component.scss'
})
export class TelegramPreviewComponent {}
