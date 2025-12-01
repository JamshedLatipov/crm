import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageLayoutComponent } from '../../shared/page-layout/page-layout.component';
import { CallInfoCardComponent } from '../../integrations/components/call-info-card/call-info-card.component';

@Component({
  selector: 'app-client-info-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    PageLayoutComponent,
    CallInfoCardComponent
  ],
  templateUrl: './client-info.component.html',
  styleUrls: ['./client-info.component.scss']
})
export class ClientInfoPageComponent {
  searchPhone = signal('');
  activePhone = signal('');

  search() {
    if (this.searchPhone()) {
      this.activePhone.set(this.searchPhone());
    }
  }

  clear() {
    this.searchPhone.set('');
    this.activePhone.set('');
  }
}
