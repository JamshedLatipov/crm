import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ivr-header',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './ivr-header.component.html',
  styleUrls: ['./ivr-header.component.scss'],
})
export class IvrHeaderComponent {
  @Output() reload = new EventEmitter<void>();
  @Output() newRoot = new EventEmitter<void>();

  onReload() {
    this.reload.emit();
  }

  onNewRoot() {
    this.newRoot.emit();
  }
}
