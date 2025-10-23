import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, interval, Subject, takeUntil } from 'rxjs';
import { AdsService } from './ads.service';

@Injectable({ providedIn: 'root' })
export class AdsStateService implements OnDestroy {
  private readonly ads = inject(AdsService);
  private stop$ = new Subject<void>();
  private readonly _accounts = new BehaviorSubject<any[]>([]);
  accounts$ = this._accounts.asObservable();

  constructor() {
    // initial load
    this.reload();
    // poll every 30s
    interval(30000).pipe(takeUntil(this.stop$)).subscribe(() => this.reload());
  }

  reload() {
    this.ads.listAccounts().subscribe({ next: r => { if (r.success && r.data) this._accounts.next(r.data); }, error: () => {} });
  }

  // helper used by UI when an account is changed
  notifyChanged() { this.reload(); }

  ngOnDestroy(): void { this.stop$.next(); this.stop$.complete(); }
}
