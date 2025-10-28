import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PromoCompaniesListComponent } from './components/promo-companies-list/promo-companies-list.component';

@Component({
  selector: 'app-promo-companies',
  standalone: true,
  imports: [CommonModule, PromoCompaniesListComponent],
  template: `
    <app-promo-companies-list></app-promo-companies-list>
  `,
  styles: []
})
export class PromoCompaniesComponent {}