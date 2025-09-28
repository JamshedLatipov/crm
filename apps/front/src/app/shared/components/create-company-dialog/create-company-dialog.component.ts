import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CompaniesService } from '../../../services/companies.service';
import { CreateCompanyDto, Company } from '../../../pipeline/dtos';

@Component({
  selector: 'app-create-company-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="dialog-header">
      <h2 mat-dialog-title>Создать компанию</h2>
      <button mat-icon-button (click)="cancel()" class="close-button"><mat-icon>close</mat-icon></button>
    </div>

    <mat-dialog-content>
      <form [formGroup]="form" class="create-company-form">
        <mat-form-field appearance="outline" class="full-width required-field">
          <mat-label>Название компании</mat-label>
          <input matInput formControlName="name" placeholder="Название" />
          <mat-error *ngIf="form.get('name')?.hasError('required')">Название обязательно</mat-error>
        </mat-form-field>

        <div class="two-col">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Юридическое название</mat-label>
            <input matInput formControlName="legalName" placeholder="Юридическое название" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>ИНН</mat-label>
            <input matInput formControlName="inn" placeholder="ИНН" />
          </mat-form-field>
        </div>

        <div class="two-col">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>KPP</mat-label>
            <input matInput formControlName="kpp" placeholder="KPP" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>OGRN</mat-label>
            <input matInput formControlName="ogrn" placeholder="OGRN" />
          </mat-form-field>
        </div>

        <div class="two-col">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Веб-сайт</mat-label>
            <input matInput formControlName="website" placeholder="https://example.com" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Телефон</mat-label>
            <input matInput formControlName="phone" placeholder="Телефон" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" placeholder="contact@company.com" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Адрес</mat-label>
          <input matInput formControlName="address" placeholder="Улица, дом, офис" />
        </mat-form-field>

        <div class="three-col">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Город</mat-label>
            <input matInput formControlName="city" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Регион</mat-label>
            <input matInput formControlName="region" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Страна</mat-label>
            <input matInput formControlName="country" />
          </mat-form-field>
        </div>

        <div class="two-col">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Почтовый индекс</mat-label>
            <input matInput formControlName="postalCode" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Количество сотрудников</mat-label>
            <input matInput type="number" formControlName="employeeCount" />
          </mat-form-field>
        </div>

        <div class="two-col">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Годовая выручка</mat-label>
            <input matInput type="number" formControlName="annualRevenue" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Теги (через запятую)</mat-label>
            <input matInput formControlName="tagsInput" placeholder="tag1, tag2" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Описание</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Заметки</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>

        <div class="two-col">
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Дата основания</mat-label>
            <input matInput formControlName="foundedDate" placeholder="YYYY-MM-DD" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="flex-1">
            <mat-label>Источник</mat-label>
            <input matInput formControlName="source" />
          </mat-form-field>
        </div>

        <!-- Social media group -->
        <div class="social-media">
          <h4>Социальные сети</h4>
          <div class="three-col">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>LinkedIn</mat-label>
              <input matInput formControlName="social_linkedin" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Facebook</mat-label>
              <input matInput formControlName="social_facebook" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Twitter</mat-label>
              <input matInput formControlName="social_twitter" />
            </mat-form-field>
          </div>
          <div class="three-col">
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Instagram</mat-label>
              <input matInput formControlName="social_instagram" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>VK</mat-label>
              <input matInput formControlName="social_vk" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="flex-1">
              <mat-label>Telegram</mat-label>
              <input matInput formControlName="social_telegram" />
            </mat-form-field>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-stroked-button (click)="cancel()">Отмена</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        <mat-spinner diameter="20" *ngIf="saving"></mat-spinner>
        <mat-icon *ngIf="!saving">add</mat-icon>
        <span>{{ saving ? 'Создание...' : 'Создать компанию' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .full-width { width: 100%; }
      .two-col { display:flex; gap:12px; }
      .three-col { display:flex; gap:12px; }
      .flex-1 { flex:1 }
      .dialog-actions { display:flex; justify-content:flex-end; gap:12px; padding-top:8px; }
      .dialog-header { display:flex; align-items:center; justify-content:space-between; }
    `
  ]
})
export class CreateCompanyDialogComponent {
  private fb = inject(FormBuilder);
  private companiesService = inject(CompaniesService);
  private dialogRef = inject(MatDialogRef<CreateCompanyDialogComponent>);

  form = this.fb.group({
    name: ['', [Validators.required]],
    legalName: [''],
    inn: [''],
    kpp: [''],
    ogrn: [''],
    website: [''],
    phone: [''],
    email: ['', []],
    address: [''],
    city: [''],
    region: [''],
    country: [''],
    postalCode: [''],
    employeeCount: [null],
    annualRevenue: [null],
    tagsInput: [''],
    description: [''],
    notes: [''],
    foundedDate: [''],
    source: [''],
    ownerId: [''],
    social_linkedin: [''],
    social_facebook: [''],
    social_twitter: [''],
    social_instagram: [''],
    social_vk: [''],
    social_telegram: ['']
  });

  saving = false;

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const nameVal = (this.form.value.name ?? '').toString().trim();

    const tagsRaw = (this.form.value.tagsInput || '').toString();
    const tags = tagsRaw.split(',').map((t: string) => t.trim()).filter((t: string) => !!t);

    const social = {
      linkedin: this.form.value.social_linkedin || undefined,
      facebook: this.form.value.social_facebook || undefined,
      twitter: this.form.value.social_twitter || undefined,
      instagram: this.form.value.social_instagram || undefined,
      vk: this.form.value.social_vk || undefined,
      telegram: this.form.value.social_telegram || undefined,
    };

    const payload: CreateCompanyDto = {
      name: nameVal,
      legalName: this.form.value.legalName || undefined,
      inn: this.form.value.inn || undefined,
      kpp: this.form.value.kpp || undefined,
      ogrn: this.form.value.ogrn || undefined,
      website: this.form.value.website || undefined,
      phone: this.form.value.phone || undefined,
      email: this.form.value.email || undefined,
      address: this.form.value.address || undefined,
      city: this.form.value.city || undefined,
      region: this.form.value.region || undefined,
      country: this.form.value.country || undefined,
      postalCode: this.form.value.postalCode || undefined,
      employeeCount: this.form.value.employeeCount || undefined,
      annualRevenue: this.form.value.annualRevenue || undefined,
      tags: tags.length ? tags : undefined,
      description: this.form.value.description || undefined,
      notes: this.form.value.notes || undefined,
      foundedDate: this.form.value.foundedDate ? new Date(this.form.value.foundedDate) : undefined,
      source: this.form.value.source || undefined,
      ownerId: this.form.value.ownerId || undefined,
      socialMedia: social,
    };

    this.companiesService.createCompany(payload).subscribe({
      next: (created: Company) => {
        this.saving = false;
        this.dialogRef.close(created);
      },
      error: (err: unknown) => {
        console.error('Failed to create company', err);
        this.saving = false;
      }
    });
  }

  cancel() {
    this.dialogRef.close(null);
  }
}
