import { Route } from '@angular/router';
import { SoftphoneComponent } from './softphone/softphone.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './auth/auth.guard';
import { IvrAdminComponent } from './ivr/ivr.component';

export const appRoutes: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: 'login' },
    { path: 'login', component: LoginComponent },
    { path: 'softphone', component: SoftphoneComponent, canActivate: [authGuard] },
    { path: 'ivr', component: IvrAdminComponent, canActivate: [authGuard] }
];
