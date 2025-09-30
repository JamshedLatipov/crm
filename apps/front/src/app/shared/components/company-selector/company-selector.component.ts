import { Component, forwardRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, debounceTime, distinctUntilChanged, switchMap, startWith, catchError } from 'rxjs';

import { Company } from '../../../pipeline/dtos';
import { CompaniesService } from '../../../services/companies.service';
import { CreateCompanyDialogComponent } from '../create-company-dialog/create-company-dialog.component';

@Component({
  selector: 'app-company-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CompanySelectorComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ placeholder }}</mat-label>
      <input
        matInput
        [formControl]="searchControl"
        [matAutocomplete]="auto"
        [placeholder]="placeholder"
      />
      <mat-icon matSuffix>business</mat-icon>
      
      <mat-autocomplete
        #auto="matAutocomplete"
        [displayWith]="displayCompany"
        (optionSelected)="onCompanySelected($event.option.value)"
      >
        <mat-option 
          *ngFor="let company of filteredCompanies | async" 
          [value]="company"
        >
          <div class="company-option">
            <div class="company-info">
              <span class="company-name">{{ company.name || company.legalName }}</span>
              <span class="company-details" *ngIf="company.industry || company.country">
                {{ company.industry }}{{ company.industry && company.country ? ' • ' : '' }}{{ company.country }}
              </span>
              <span class="company-website" *ngIf="company.website">
                {{ company.website }}
              </span>
            </div>
          </div>
        </mat-option>
        
        <!-- Опция создания новой компании -->
        <mat-option 
          *ngIf="searchControl.value && (filteredCompanies | async)?.length === 0"
          (click)="createNewCompany()"
        >
          <div class="create-company-option">
            <mat-icon>add_circle</mat-icon>
            <span>Создать компанию "{{ searchControl.value }}"</span>
          </div>
        </mat-option>
      </mat-autocomplete>
    </mat-form-field>
  `,
  styleUrls: ['./company-selector.component.scss']
})
export class CompanySelectorComponent implements ControlValueAccessor, OnInit {
  private readonly companiesService = inject(CompaniesService);
  private readonly dialog = inject(MatDialog);

  searchControl = new FormControl('');
  filteredCompanies: Observable<Company[]> = of([]);
  placeholder = 'Выберите компанию';
  
  selectedCompany: Company | null = null;
  
  // ControlValueAccessor implementation
  private onChange = (value: string | null) => {
    // This will be overridden by registerOnChange
    void value;
  };
  private onTouched = () => {
    // This will be overridden by registerOnTouched
  };

  ngOnInit(): void {
    this.filteredCompanies = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value === 'string' && value.trim()) {
          return this.companiesService.searchCompanies(value).pipe(
            catchError(() => of([]))
          );
        }
        return of([]);
      })
    );
  }

  displayCompany(company: Company | null): string {
    return company ? (company.name || company.legalName || '') : '';
  }

  onCompanySelected(company: Company): void {
    this.selectedCompany = company;
    this.onChange(company.id); // Передаем только ID компании
    this.onTouched();
  }

  createNewCompany(): void {
    const name = this.searchControl.value || '';
    
    const dialogRef = this.dialog.open(CreateCompanyDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { 
        initialData: { name } 
      }
    });

    dialogRef.afterClosed().subscribe((newCompany: Company | undefined) => {
      if (newCompany) {
        this.selectedCompany = newCompany;
        this.searchControl.setValue(newCompany.name || newCompany.legalName || '', { emitEvent: false });
        this.onChange(newCompany.id); // Передаем только ID
        this.onTouched();
      }
    });
  }

  // ControlValueAccessor methods
  writeValue(value: string | null): void {
    // При получении ID, нужно найти компанию для отображения
    if (value) {
      this.companiesService.getCompany(value).subscribe({
        next: (company) => {
          this.selectedCompany = company;
          this.searchControl.setValue(company.name || company.legalName || '', { emitEvent: false });
        },
        error: () => {
          this.selectedCompany = null;
          this.searchControl.setValue('', { emitEvent: false });
        }
      });
    } else {
      this.selectedCompany = null;
      this.searchControl.setValue('', { emitEvent: false });
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.searchControl.disable();
    } else {
      this.searchControl.enable();
    }
  }
}