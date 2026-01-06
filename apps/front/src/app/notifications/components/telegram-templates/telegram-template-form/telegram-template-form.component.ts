import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PageLayoutComponent } from '../../../../shared/page-layout/page-layout.component';
import { VariableSelectorComponent } from '../../variable-selector/variable-selector.component';

@Component({
  selector: 'app-telegram-template-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSlideToggleModule,
    PageLayoutComponent,
    VariableSelectorComponent
  ],
  templateUrl: './telegram-template-form.component.html',
  styleUrl: './telegram-template-form.component.scss'
})
export class TelegramTemplateFormComponent {
  /**
   * Вставить переменную в позицию курсора в textarea
   */
  insertVariable(variableSyntax: string, textarea: HTMLTextAreaElement): void {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    // Вставляем переменную в позицию курсора
    const newText = text.substring(0, start) + variableSyntax + text.substring(end);
    textarea.value = newText;
    
    // Устанавливаем курсор после вставленной переменной
    const newCursorPos = start + variableSyntax.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    textarea.focus();
    
    // Триггерим событие input для реактивных форм
    textarea.dispatchEvent(new Event('input'));
  }
}
