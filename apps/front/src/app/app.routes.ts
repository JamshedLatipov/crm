import { Route } from '@angular/router';
import { SoftphoneComponent } from './softphone/softphone.component';
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

export const appRoutes: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'login', component: LoginComponent },
    { path: 'auth-test', component: AuthTestComponent, canActivate: [authGuard] },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'contacts', component: ContactsComponent, canActivate: [authGuard] },
    { path: 'contacts/view/:id', component: ContactDetailComponent, canActivate: [authGuard] },
    { 
        path: 'deals', 
        component: DealsComponent, 
        canActivate: [authGuard]
    },
    { path: 'deals/view/:id', component: DealDetailComponent, canActivate: [authGuard] },
    { path: 'softphone', component: SoftphoneComponent, canActivate: [authGuard] },
    {
        path: 'contact-center',
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'monitoring', pathMatch: 'full' },
            { path: 'monitoring', component: OnlineMonitoringComponent },
            { path: 'ivr', component: IvrAdminComponent },
            { path: 'scripts', component: CallScriptsManagerComponent },
            { path: 'scripts/categories', component: CallScriptCategoriesListPageComponent },
            { path: 'scripts/view/:id', component: CallScriptPreviewPageComponent }
        ]
    },
    { path: 'calls', redirectTo: 'softphone' }, // Redirect calls to softphone
    { path: 'reports', component: DashboardComponent, canActivate: [authGuard] }, // Temporary redirect
    { path: 'reports/dashboard', loadComponent: () => import('./pages/reports/reports-dashboard.component').then(m => m.ReportsDashboardComponent), canActivate: [authGuard] },
    { path: 'help', component: DashboardComponent, canActivate: [authGuard] }, // Temporary redirect
    { path: 'pipeline', component: PipelineComponent, canActivate: [authGuard] },
    { path: 'pipeline/create-stage', component: CreateStageComponent, canActivate: [authGuard] },
    { 
        path: 'leads', 
        component: LeadsComponent, 
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'list', pathMatch: 'full' },
            { path: 'dashboard', component: LeadsDashboardComponent },
            { path: 'list', component: LeadsListComponent },
            { path: 'view/:id', component: LeadDetailComponent }
        ]
    },
    {
        path: 'users',
        canActivate: [authGuard],
        children: usersRoutes
    }
    ,
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
            { path: 'edit/:id', component: TaskFormComponent }
        ]
    }
    ,
    { path: 'ads', component: AdsCampaignsComponent, canActivate: [authGuard] },
    { path: 'ads/:id', component: AdsCampaignDetailComponent, canActivate: [authGuard] },
    { path: 'ads/accounts', component: AdsAccountsComponent, canActivate: [authGuard] },
    { path: 'promo-companies', component: PromoCompaniesComponent, canActivate: [authGuard] }
];
