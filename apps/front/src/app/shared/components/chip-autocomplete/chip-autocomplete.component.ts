import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';

export interface ChipOption { id: string; name: string }

@Component({
  selector: 'app-chip-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, MatChipsModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatOptionModule],
  templateUrl: './chip-autocomplete.component.html',
  styleUrls: ['./chip-autocomplete.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChipAutocompleteComponent {
  @Input() selected: string[] | null = [];
  @Input() options: ChipOption[] = [];
  @Input() placeholder = '';
  @Input() noOptionsText = 'Нет доступных элементов';
  @Input() color: 'primary' | 'accent' | 'warn' = 'primary';

  @Output() add = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();

  public readonly inputValue = signal<string>('');
  public readonly showSelector = signal<boolean>(false);

  public readonly filtered = computed(() => {
    const selected = this.selected || [];
    return (this.options || []).filter(o => !selected.includes(o.id));
  });

  // Further filter by the typed input value (case-insensitive)
  public readonly filteredByInput = computed(() => {
    const q = this.inputValue().trim().toLowerCase();
    if (!q) return this.filtered();
    return this.filtered().filter(o => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
  });

  openSelector(): void {
    this.showSelector.set(true);
    setTimeout(() => {
      const el = document.getElementById(this.inputId) as HTMLInputElement | null;
      el?.focus();
    }, 50);
  }

  public readonly inputId = `chip-input-${Math.random().toString(36).slice(2,8)}`;

  getOptionName(id: string): string {
    return (this.options || []).find(o => o.id === id)?.name || id;
  }

  findIdByName(name: string): string | undefined {
    return (this.options || []).find(o => o.name === name || o.id === name)?.id;
  }

  onOptionSelected(id: string): void {
    if (!id) return;
    this.add.emit(id);
    this.inputValue.set('');
    this.showSelector.set(false);
  }

  onAddClick(): void {
    const raw = this.inputValue().trim();
    if (!raw) return;
    const mapped = this.findIdByName(raw) || raw;
    this.add.emit(mapped);
    this.inputValue.set('');
    this.showSelector.set(false);
  }

  onRemove(id: string): void {
    this.remove.emit(id);
  }
}
