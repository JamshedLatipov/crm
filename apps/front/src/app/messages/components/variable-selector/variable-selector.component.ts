import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TemplateVariablesService, VariableGroup, TemplateVariable } from '../../services/template-variables.service';

@Component({
  selector: 'app-variable-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './variable-selector.component.html',
  styleUrl: './variable-selector.component.scss'
})
export class VariableSelectorComponent {
  @Output() variableSelected = new EventEmitter<string>();

  private readonly variablesService = inject(TemplateVariablesService);

  variableGroups: VariableGroup[] = this.variablesService.getVariableGroups();

  onVariableClick(variable: TemplateVariable): void {
    const syntax = this.variablesService.getVariableSyntax(variable.key);
    this.variableSelected.emit(syntax);
  }
}
