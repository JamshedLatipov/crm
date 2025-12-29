import { Routes } from '@angular/router';

export const NOTIFICATION_ROUTES: Routes = [
  {
    path: 'notifications',
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'campaigns',
        loadComponent: () =>
          import('./components/campaigns/campaign-list/campaign-list.component').then(
            (m) => m.CampaignListComponent
          ),
      },
      {
        path: 'campaigns/new',
        loadComponent: () =>
          import('./components/campaigns/campaign-wizard/campaign-wizard.component').then(
            (m) => m.CampaignWizardComponent
          ),
      },
      {
        path: 'campaigns/:id',
        loadComponent: () =>
          import('./components/campaigns/campaign-form/campaign-form.component').then(
            (m) => m.CampaignFormComponent
          ),
      },
      {
        path: 'campaigns/:id/stats',
        loadComponent: () =>
          import('./components/campaigns/campaign-stats/campaign-stats.component').then(
            (m) => m.CampaignStatsComponent
          ),
      },
      {
        path: 'sms-templates',
        loadComponent: () =>
          import('./components/sms-templates/sms-template-list/sms-template-list.component').then(
            (m) => m.SmsTemplateListComponent
          ),
      },
      {
        path: 'sms-templates/new',
        loadComponent: () =>
          import('./components/sms-templates/sms-template-form/sms-template-form.component').then(
            (m) => m.SmsTemplateFormComponent
          ),
      },
      {
        path: 'sms-templates/:id',
        loadComponent: () =>
          import('./components/sms-templates/sms-template-form/sms-template-form.component').then(
            (m) => m.SmsTemplateFormComponent
          ),
      },
      {
        path: 'sms-templates/:id/preview',
        loadComponent: () =>
          import('./components/sms-templates/sms-preview/sms-preview.component').then(
            (m) => m.SmsPreviewComponent
          ),
      },
      {
        path: 'email-templates',
        loadComponent: () =>
          import('./components/email-templates/email-template-list/email-template-list.component').then(
            (m) => m.EmailTemplateListComponent
          ),
      },
      {
        path: 'email-templates/new',
        loadComponent: () =>
          import('./components/email-templates/email-template-form/email-template-form.component').then(
            (m) => m.EmailTemplateFormComponent
          ),
      },
      {
        path: 'email-templates/:id',
        loadComponent: () =>
          import('./components/email-templates/email-template-form/email-template-form.component').then(
            (m) => m.EmailTemplateFormComponent
          ),
      },
      {
        path: 'email-templates/:id/preview',
        loadComponent: () =>
          import('./components/email-templates/email-preview/email-preview.component').then(
            (m) => m.EmailPreviewComponent
          ),
      },
      {
        path: 'segments',
        loadComponent: () =>
          import('./components/segments/segment-list/segment-list.component').then(
            (m) => m.SegmentListComponent
          ),
      },
      {
        path: 'segments/new',
        loadComponent: () =>
          import('./components/segments/segment-form/segment-form.component').then(
            (m) => m.SegmentFormComponent
          ),
      },
      {
        path: 'segments/:id',
        loadComponent: () =>
          import('./components/segments/segment-form/segment-form.component').then(
            (m) => m.SegmentFormComponent
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./components/analytics/analytics.component').then((m) => m.AnalyticsComponent),
      },
    ],
  },
];
