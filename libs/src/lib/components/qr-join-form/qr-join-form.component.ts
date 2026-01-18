import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoApiService, JoinQueueDto } from '../../services/sto-api.service';

@Component({
  selector: 'sto-qr-join-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-join-form.component.html',
  styleUrls: ['./qr-join-form.component.scss']
})
export class QrJoinFormComponent implements OnInit {
  // Form state
  token = signal<string>('');
  phone = signal<string>('');
  customerName = signal<string>('');
  vehicleMake = signal<string>('');
  vehicleModel = signal<string>('');
  vehicleYear = signal<number>(new Date().getFullYear());
  licensePlate = signal<string>('');
  workType = signal<string>('');
  workDescription = signal<string>('');

  // Queue info
  queueInfo = signal<{ zone: string; availableWorkTypes: string[]; estimatedWaitMinutes: number } | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Computed
  get maxYear(): number {
    return new Date().getFullYear() + 1;
  }
  success = signal(false);
  successData = signal<{ orderId?: string; queueNumber: number; estimatedWaitMinutes: number } | null>(null);

  // Validation
  formValid = computed(() => {
    return this.phone().length >= 10;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: StoApiService
  ) {}

  ngOnInit(): void {
    // Get token from URL query params
    this.route.queryParamMap.subscribe(params => {
      const token = params.get('token');
      if (token) {
        this.token.set(token);
        this.loadQueueInfo();
      } else {
        // If no token in URL, use default demo token
        this.token.set('demo-zone-a');
        this.loadQueueInfo();
      }
    });
  }

  loadQueueInfo(): void {
    this.loading.set(true);
    this.error.set(null);

    this.apiService.getQueueInfo(this.token()).subscribe({
      next: (info) => {
        this.queueInfo.set(info);
        
        // Pre-select first work type if available
        if (info.availableWorkTypes.length > 0) {
          const firstWorkType = info.availableWorkTypes[0];
          if (firstWorkType) {
            this.workType.set(firstWorkType);
          }
        }
        
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Не удалось загрузить информацию о зоне');
        this.loading.set(false);
      }
    });
  }

  submitForm(): void {
    if (!this.formValid()) {
      this.error.set('Пожалуйста, заполните все обязательные поля');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const data: JoinQueueDto = {
      token: this.token(),
      phone: this.phone(),
      customerName: this.customerName() || undefined,
      vehicleMake: this.vehicleMake() || undefined,
      vehicleModel: this.vehicleModel() || undefined,
      vehicleYear: this.vehicleYear(),
      licensePlate: this.licensePlate() || undefined,
      workType: this.workType() || undefined,
      workDescription: this.workDescription() || undefined,
    };

    this.apiService.joinQueue(data).subscribe({
      next: (response) => {
        this.success.set(true);
        this.successData.set({
          orderId: response.orderId,
          queueNumber: response.queueNumber,
          estimatedWaitMinutes: response.estimatedWaitMinutes,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Не удалось записаться в очередь');
        this.loading.set(false);
      }
    });
  }

  trackOrder(): void {
    const data = this.successData();
    if (data?.orderId) {
      this.router.navigate(['/track', data.orderId], {
        queryParams: { phone: this.phone() }
      });
    }
  }

  resetForm(): void {
    this.success.set(false);
    this.successData.set(null);
    this.phone.set('');
    this.customerName.set('');
    this.vehicleMake.set('');
    this.vehicleModel.set('');
    this.vehicleYear.set(new Date().getFullYear());
    this.licensePlate.set('');
    this.workDescription.set('');
  }

  getWorkTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'maintenance': 'Техническое обслуживание',
      'repair': 'Ремонт',
      'diagnostic': 'Диагностика',
      'bodywork': 'Кузовные работы',
      'tire': 'Шиномонтаж',
      'wash': 'Мойка',
    };
    return labels[type] || type;
  }
}
