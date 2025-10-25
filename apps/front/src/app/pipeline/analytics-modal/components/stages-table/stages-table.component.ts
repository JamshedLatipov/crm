import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { StageAnalytics } from '../../../dtos';

@Component({
  selector: 'app-stages-table',
  standalone: true,
  imports: [CommonModule, MatTableModule],
  templateUrl: './stages-table.component.html',
  styleUrls: ['./stages-table.component.scss']
})
export class StagesTableComponent {
  @Input() stages: StageAnalytics[] | null = null;

  displayedColumns = ['name', 'count', 'totalAmount', 'averageAmount', 'conversion', 'averageTimeInStage'];

  getFunnelColor(index: number): string {
    const colors = ['#667eea','#764ba2','#f093fb','#4facfe','#43e97b','#fa709a'];
    return colors[index % colors.length];
  }
}
