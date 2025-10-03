import { Component, Input } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-contact-details-deals-list',
  templateUrl: './contact-details-deals-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
})
export class ContactDetailsDealsListComponent {
  @Input() deals: any[] = [];
  @Input() dealsLoading: boolean = false;

  @Input() getDealStatusLabel!: (status: string) => string;
  @Input() openDeal!: (id: string) => void;
  @Input() editDeal!: (deal: any) => void;
  @Input() deleteDeal!: (id: string) => void;
  @Input() createDeal!: () => void;
}
