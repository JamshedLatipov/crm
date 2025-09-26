import { Route } from '@angular/router';
import { SoftphoneComponent } from './softphone/softphone.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './auth/auth.guard';
import { IvrAdminComponent } from './ivr/ivr.component';
import { LeadsComponent } from './leads/leads.component';
import { LeadsListComponent } from './leads/components/leads-list/leads-list.component';
import { LeadsDashboardComponent } from './leads/components/leads-dashboard.component';
import { LeadDetailComponent } from './leads/components/lead-detail.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ContactsComponent } from './contacts/contacts.component';
import { DealsComponent } from './deals/deals.component';

export const appRoutes: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'login', component: LoginComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'contacts', component: ContactsComponent, canActivate: [authGuard] },
    { path: 'deals', component: DealsComponent, canActivate: [authGuard] },
    { path: 'softphone', component: SoftphoneComponent, canActivate: [authGuard] },
    { path: 'ivr', component: IvrAdminComponent, canActivate: [authGuard] },
    { path: 'calls', redirectTo: 'softphone' }, // Redirect calls to softphone
    { path: 'reports', component: DashboardComponent, canActivate: [authGuard] }, // Temporary redirect
    { path: 'help', component: DashboardComponent, canActivate: [authGuard] }, // Temporary redirect
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
    }
];
