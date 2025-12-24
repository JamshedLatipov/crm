import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-softphone-dial-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  host: { 'class': 'dialer-section content-section' },
  styleUrls: ['./softphone-dial-tab.component.scss'],
  templateUrl: './softphone-dial-tab.component.html',
})
export class SoftphoneDialTabComponent implements OnChanges {
  @Input() callee = '';
  @Output() calleeChange = new EventEmitter<string>();
  @Output() call = new EventEmitter<void>();
  @Output() pressKey = new EventEmitter<string>();
  @Output() removeLast = new EventEmitter<void>();
  @Output() clearNumber = new EventEmitter<void>();

  localCallee = '';
  keys = ['1','2','3','4','5','6','7','8','9','*','0','#'];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['callee']) this.localCallee = this.callee ?? '';
  }

  onCalleeChange(v: string) { this.calleeChange.emit(v); }
  onPressKey(k: string) { this.pressKey.emit(k); }
}
