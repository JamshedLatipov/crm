import { Component, input, output, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Script {
  id: string;
  title: string;
  description: string;
  steps?: string[];
  questions?: string[];
  tips?: string[];
  expanded?: boolean;
}

@Component({
  selector: 'app-softphone-scripts-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './softphone-scripts-panel.component.html',
  styleUrls: ['./softphone-scripts-panel.component.scss'],
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
  changeDetection: ChangeDetectionStrategy.Default
})
export class SoftphoneScriptsPanelComponent implements OnChanges {
  callActive = input<boolean>(false);
  showScripts = input<boolean>(false);
  scripts = input<Script[]>([]);

  toggleScripts = output<void>();

  toggleScript(scriptId: string): void {
    const updatedScripts = this.scripts().map(script =>
      script.id === scriptId ? { ...script, expanded: !script.expanded } : script
    );
    // Note: Since scripts is an input signal, we can't modify it directly.
    // The parent component should handle this logic.
  }

  trackByScriptId(index: number, script: Script): string {
    return script.id;
  }

  ngOnChanges(changes: SimpleChanges) {
    // Handle changes if needed
  }
}