import { Route } from '@angular/router';
import { SoftphoneComponent } from './softphone/softphone.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './auth/auth.guard';

export const appRoutes: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: 'login' },
    { path: 'login', component: LoginComponent },
    { path: 'softphone', component: SoftphoneComponent, canActivate: [authGuard] }
];
