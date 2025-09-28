import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { CompaniesService } from '../../../services/companies.service';
import { MatDialog } from '@angular/material/dialog';
import { CreateCompanyDialogComponent } from '../create-company-dialog/create-company-dialog.component';
import { Company } from '../../../pipeline/dtos';
import { of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
} from 'rxjs/operators';

@Component({
  selector: 'app-company-autocomplete',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatOptionModule,
  ],
  template: `
    <mat-form-field appearance="outline" class="full-width">
      <mat-label>{{ placeholder || 'Компания' }}</mat-label>
      <input
        type="text"
        matInput
        [matAutocomplete]="auto"
        [formControl]="control"
        autocomplete="off"
      />
      <mat-icon matSuffix>business</mat-icon>
      <mat-autocomplete
        #auto="matAutocomplete"
        [displayWith]="displayWith"
        (optionSelected)="onSelected($event.option.value)"
      >
        <mat-option *ngFor="let c of companyOptions" [value]="c">
          {{ c.name || c.legalName }}
        </mat-option>
      </mat-autocomplete>

      <div class="create-inline" *ngIf="showCreateInline">
        <button
          mat-mini-button
          color="primary"
          (click)="createCompanyFromInput()"
        >
          Создать компанию «{{ inlineCompanyText }}»
        </button>
      </div>
    </mat-form-field>
  `,
  styles: [
    `
      .full-width {
        width: 100%;
      }
      .create-inline {
        margin-top: 6px;
      }
    `,
  ],
})
export class CompanyAutocompleteComponent implements OnInit {
  displayWith(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.name || value.legalName || '';
  }
  @Input({ required: true })
  control!: import('@angular/forms').FormControl<unknown>;
  @Input() idControl?:
    | import('@angular/forms').FormControl<string | null>
    | undefined;
  @Input() placeholder?: string;

  private readonly companiesService = inject(CompaniesService);
  private readonly dialog = inject(MatDialog);

  companyOptions: Company[] = [];
  showCreateInline = false;
  inlineCompanyText = '';

  ngOnInit(): void {
    if (!this.control) return;
    // control has valueChanges
    const vc = this.control as FormControl<unknown>;
    vc.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value: unknown) => {
          const q =
            typeof value === 'string'
              ? value
              : (value as Company)?.name ?? (value as Company)?.legalName ?? '';
          if (!q || (q as string).length < 1) {
            this.companyOptions = [];
            this.showCreateInline = false;
            return of([] as Company[]);
          }
          this.inlineCompanyText = q as string;
          return this.companiesService
            .searchCompanies(q as string)
            .pipe(catchError(() => of([] as Company[])));
        })
      )
      .subscribe((list: Company[]) => {
        this.companyOptions = list || [];
        this.showCreateInline =
          this.companyOptions.length === 0 && !!this.inlineCompanyText;
      });
  }

  onSelected(company: Company | null) {
    if (!company) return;
    if (this.control) this.control.setValue(company ?? null);
    if (this.idControl && company.id) this.idControl.setValue(company.id);
    this.showCreateInline = false;
  }

  createCompanyFromInput() {
    // Open the full Create Company dialog instead of quick-create
    const ref = this.dialog.open(CreateCompanyDialogComponent, {
      width: '600px',
      data: {},
    });

    ref.afterClosed().subscribe((created: Company | null | undefined) => {
      if (!created) return;
      if (this.control)
        this.control.setValue(created.name ?? created.legalName ?? null);
      if (this.idControl) this.idControl.setValue(created.id ?? null);
      this.companyOptions = [created];
      this.showCreateInline = false;
    });
  }
}
