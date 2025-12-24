import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

/**
 * Universal status tabs component.
 * - Accepts a configurable `tabs` array (label + value [+ count]) so it can be reused
 *   in contacts, leads, users, deals, etc.
 * - Keeps the original behavior by providing sensible defaults.
 */
export interface StatusTab {
  label: string; // visible label
  value: string | null; // value emitted (null represents "All")
  count?: number; // optional badge/count to display
  disabled?: boolean;
}

@Component({
  selector: 'app-status-tabs',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './status-tabs.component.html',
  styleUrls: ['./status-tabs.component.scss']
})
export class StatusTabsComponent implements OnInit {
  /**
   * Currently selected tab value. Use `null` for "All".
   */
  @Input() selected: string | null = null;

  /**
   * Optional array of tabs. If omitted, a sensible default (Все / Открытые / Выигранные / Проигранные)
   * is used so the component remains backward compatible with existing callers.
   */
  @Input() tabs?: StatusTab[];

  /**
   * Emit when selection changes.
   */
  @Output() selectedChange = new EventEmitter<string | null>();

  /**
   * When true, clicking the currently active tab will deselect it (emit null).
   * Default: false (keeps previous behavior).
   */
  @Input() allowDeselect = false;

  /**
   * When true, shows per-tab counts if provided in the `tabs` array.
   */
  @Input() showCounts = false;

  effectiveTabs: StatusTab[] = [];

  private readonly defaultTabs: StatusTab[] = [
    { label: 'Все', value: null },
    { label: 'Открытые', value: 'open' },
    { label: 'Выигранные', value: 'won' },
    { label: 'Проигранные', value: 'lost' },
  ];

  ngOnInit(): void {
    this.effectiveTabs = this.tabs && this.tabs.length ? this.tabs : this.defaultTabs;
  }

  onSelect(value: string | null) {
    if (this.selected === value) {
      if (this.allowDeselect) {
        this.selected = null;
        this.selectedChange.emit(null);
      }
      return; // no change
    }

    this.selected = value;
    this.selectedChange.emit(this.selected);
  }

  trackByValue(_idx: number, item: StatusTab) {
    return item.value === null ? '__all' : item.value;
  }
}
