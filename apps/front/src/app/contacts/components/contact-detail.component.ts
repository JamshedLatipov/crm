import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContactsService } from '../contacts.service';

@Component({
  selector: 'app-contact-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen bg-background-light dark:bg-background-dark font-display text-gray-800 dark:text-gray-200">
      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <a class="hover:text-primary" routerLink="/contacts">Contacts</a>
          <span>/</span>
          <span class="font-medium text-gray-800 dark:text-gray-200">{{ contactsService.formatContactName(contact) }}</span>
        </div>

        <div *ngIf="loading" class="flex items-center justify-center p-8">
          <div class="w-12 h-12 border-4 border-gray-200 rounded-full border-t-primary animate-spin"></div>
        </div>

        <div *ngIf="!loading && contact" class="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          <div class="flex-1 space-y-8">
            <div class="flex flex-col items-center gap-6 rounded-lg bg-white p-6 shadow-sm dark:bg-background-dark/50 sm:flex-row">
              <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-32 shrink-0" [ngStyle]="{'background-image': 'url(' + (contact.avatar || placeholderAvatar) + ')'}" style="width:96px;height:96px"></div>
              <div class="flex-1 text-center sm:text-left">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ contactsService.formatContactName(contact) }}</h1>
                <p class="mt-1 text-gray-600 dark:text-gray-400">{{ contact.position }}{{ contact.company ? ' at ' + contact.company : '' }}</p>
                <div class="mt-4 flex justify-center gap-2 sm:justify-start">
                  <span class="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900/50 dark:text-green-300"> Lead Score: {{ contact.leadScore || '—' }} </span>
                </div>
              </div>
              <button class="w-full shrink-0 rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 sm:w-auto" (click)="onEdit()">Edit Contact</button>
            </div>

            <div class="rounded-lg bg-white shadow-sm dark:bg-background-dark/50">
              <div class="border-b border-gray-200 dark:border-gray-700/50">
                <nav class="-mb-px flex space-x-6 px-6">
                  <a class="shrink-0 border-b-2 border-primary px-1 py-4 text-sm font-medium text-primary" href="#">Details</a>
                  <a class="shrink-0 border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300" href="#">Activity</a>
                  <a class="shrink-0 border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300" href="#">Emails</a>
                </nav>
              </div>
              <div class="p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Contact Information</h3>
                <dl class="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <div class="sm:col-span-1">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-200">{{ contact.email || '—' }}</dd>
                  </div>
                  <div class="sm:col-span-1">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-200">{{ contact.phone || '—' }}</dd>
                  </div>
                  <div class="sm:col-span-1">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Job Title</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-200">{{ contact.position || '—' }}</dd>
                  </div>
                  <div class="sm:col-span-1">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Company</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-200">{{ contact.company || '—' }}</dd>
                  </div>
                  <div class="sm:col-span-1">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Industry</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-200">{{ contact.industry || '—' }}</dd>
                  </div>
                  <div class="sm:col-span-1">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Location</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-200">{{ contact.city || contact.country || '—' }}</dd>
                  </div>
                  <div class="sm:col-span-1">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Lead Source</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-200">{{ contact.source || '—' }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div class="rounded-lg bg-white shadow-sm dark:bg-background-dark/50">
              <div class="p-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Associated Deals</h3>
                <div class="mt-4 flow-root">
                  <div class="-mx-6 -my-2 overflow-x-auto">
                    <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead class="bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                            <th class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-0">Deal Name</th>
                            <th class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Stage</th>
                            <th class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Amount</th>
                            <th class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Close Date</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-background-dark/50">
                          <tr *ngFor="let d of contact.deals || []">
                            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:pl-0">{{ d.name }}</td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{{ d.stage }}</td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{{ d.amount | currency }}</td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{{ d.closeDate }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside class="w-full lg:w-96 lg:shrink-0">
            <div class="space-y-6 rounded-lg bg-white p-6 shadow-sm dark:bg-background-dark/50">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              <div class="flow-root">
                <ul class="-mb-8" role="list">
                  <li *ngFor="let a of (contact.activity || [])">
                    <div class="relative pb-8">
                      <span aria-hidden="true" class="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"></span>
                      <div class="relative flex items-start space-x-3">
                        <div>
                          <div class="relative h-8 w-8 flex items-center justify-center rounded-full bg-primary/10 text-primary">
                            <mat-icon>history</mat-icon>
                          </div>
                        </div>
                        <div class="min-w-0 flex-1 pt-1.5">
                          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ a.title }}</p>
                          <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ a.date }}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class ContactDetailComponent implements OnInit {
  contact: any = null;
  loading = true;
  placeholderAvatar = 'https://via.placeholder.com/150';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly contactsService = inject(ContactsService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.goBack();
      return;
    }

    this.contactsService.getContactById(id).subscribe({
      next: (c) => { this.contact = c; this.loading = false; },
      error: () => { this.loading = false; this.goBack(); }
    });
  }

  goBack() { this.router.navigate(['/contacts']); }

  onEdit() {
    // placeholder: navigate to edit or open dialog
    this.router.navigate(['/contacts']);
  }
}
