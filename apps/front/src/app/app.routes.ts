import { Route } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { authGuard } from './auth/auth.guard';
import { AuthTestComponent } from './auth/auth-test.component';
import { IvrAdminComponent } from './ivr/containers/ivr-list/ivr.component';
import { OnlineMonitoringComponent } from './contact-center/monitoring/online-monitoring.component';
import { CallScriptsManagerComponent } from './contact-center/scripts/call-scripts-manager.component';
import { CallScriptCategoriesListPageComponent } from './contact-center/scripts/call-script-categories-list-page/call-script-categories-list-page.component';
import { CallScriptPreviewPageComponent } from './contact-center/scripts/call-script-preview/call-script-preview.component';
import { LeadsComponent } from './leads/leads.component';
import { LeadsListComponent } from './leads/components/leads-list/leads-list.component';
import { LeadsDashboardComponent } from './leads/components/leads-dashboard.component';
import { LeadDetailComponent } from './leads/components/lead-detail.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ContactsComponent } from './contacts/contacts.component';
import { ContactDetailComponent } from './contacts/components/contact-detail.component/contact-detail.component';
import { DealsComponent } from './deals/deals.component';
import { DealDetailComponent } from './deals/components/deal-detail.component/deal-detail.component';
import { PipelineComponent } from './pipeline/pipeline.component';
import { CreateStageComponent } from './pipeline/create-stage/create-stage.component';
import { TaskListComponent } from './tasks/task-list/task-list.component';
import { TaskFormComponent } from './tasks/task-form/task-form.component';
import { TaskDetailComponent } from './tasks/task-detail/task-detail.component';
import { TaskTypesManagerComponent } from './components/task-types-manager.component';
import { usersRoutes } from './pages/users/users.routes';
import { AdsCampaignsComponent } from './pages/ads/ads-campaigns.component';
import { AdsCampaignDetailComponent } from './pages/ads/ads-campaign-detail.component';
import { AdsAccountsComponent } from './pages/ads/ads-accounts.component';
import { TaskCalendarPageComponent } from './tasks/task-calendar/task-calendar-page.component';
import { PromoCompaniesComponent } from './promo-companies/promo-companies.component';
import { ContactCenterCallsComponent } from './contact-center/calls/calls-list.component';
import { QueuesPageComponent } from './contact-center/queues/queues.component';
import { SourcesReportComponent } from './contact-center/reports/sources-report/sources-report.component';
import { OperatorsReportComponent } from './contact-center/reports/operators-report/operators-report.component';
import { QueuesReportComponent } from './contact-center/reports/queues-report/queues-report.component';
import { IntegrationsComponent } from './pages/integrations/integrations.component';
import { ClientInfoPageComponent } from './pages/client-info/client-info.component';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginComponent },
  { path: 'auth-test', component: AuthTestComponent, canActivate: [authGuard] },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  { path: 'contacts', component: ContactsComponent, canActivate: [authGuard] },
  {
    path: 'contacts/view/:id',
    component: ContactDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: 'deals',
    component: DealsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'deals/view/:id',
    component: DealDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: 'contact-center',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'monitoring', pathMatch: 'full' },
      { path: 'calls', component: ContactCenterCallsComponent },
      {
        path: 'logs',
        loadComponent: () =>
          import('./contact-center/call-logs/call-logs.component').then(
            (m) => m.CallLogsComponent
          ),
      },
        { path: 'monitoring', component: OnlineMonitoringComponent },
         { path: 'queues', component: QueuesPageComponent },
      {
        path: 'pjsip',
        loadComponent: () =>
          import('./contact-center/pjsip/ps-endpoints.component').then(
            (m) => m.PsEndpointsComponent
          ),
      },
      { path: 'ivr', component: IvrAdminComponent },
      { path: 'scripts', component: CallScriptsManagerComponent },
      {
        path: 'scripts/categories',
        component: CallScriptCategoriesListPageComponent,
      },
      { path: 'scripts/view/:id', component: CallScriptPreviewPageComponent },
      // contact-center specific routes (monitoring, calls, ivr, scripts)
    ],
  },
  { path: 'calls', redirectTo: 'softphone' }, // Redirect calls to softphone
  { path: 'reports', component: DashboardComponent, canActivate: [authGuard] }, // Temporary redirect
  {
    path: 'reports/dashboard',
    loadComponent: () =>
      import('./pages/reports/reports-dashboard.component').then(
        (m) => m.ReportsDashboardComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'reports/contact-center/sources',
    component: SourcesReportComponent,
    canActivate: [authGuard],
  },
  {
    path: 'reports/contact-center/operators',
    component: OperatorsReportComponent,
    canActivate: [authGuard],
  },
  {
    path: 'reports/contact-center/queues',
    component: QueuesReportComponent,
    canActivate: [authGuard],
  },
  { path: 'help', component: DashboardComponent, canActivate: [authGuard] }, // Temporary redirect
  { path: 'pipeline', component: PipelineComponent, canActivate: [authGuard] },
  {
    path: 'pipeline/create-stage',
    component: CreateStageComponent,
    canActivate: [authGuard],
  },
  {
    path: 'leads',
    component: LeadsComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'dashboard', component: LeadsDashboardComponent },
      { path: 'list', component: LeadsListComponent },
      { path: 'view/:id', component: LeadDetailComponent },
    ],
  },
  {
    path: 'users',
    canActivate: [authGuard],
    children: usersRoutes,
  },
  {
    path: 'tasks',
    canActivate: [authGuard],
    children: [
      { path: '', component: TaskListComponent },
      { path: 'calendar', component: TaskCalendarPageComponent },
      { path: 'types', component: TaskTypesManagerComponent },
      { path: 'new', component: TaskFormComponent },
      { path: 'create', component: TaskFormComponent },
      { path: ':id', component: TaskDetailComponent },
      { path: 'view/:id', component: TaskDetailComponent },
      { path: 'edit/:id', component: TaskFormComponent },
    ],
  },
  { path: 'ads', component: AdsCampaignsComponent, canActivate: [authGuard] },
  {
    path: 'ads/:id',
    component: AdsCampaignDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: 'ads/accounts',
    component: AdsAccountsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'promo-companies',
    component: PromoCompaniesComponent,
    canActivate: [authGuard],
  },
  {
    path: 'integrations',
    component: IntegrationsComponent,
    canActivate: [authGuard],
  },
  {
    path: 'client-info',
    component: ClientInfoPageComponent,
    canActivate: [authGuard],
  },
];
