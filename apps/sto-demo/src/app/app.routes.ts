import { Route } from '@angular/router';
import {
  DisplayBoardComponent,
  TrackingPageComponent,
  MechanicTerminalComponent,
  QrJoinFormComponent,
} from '@sto/ui';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'display',
    component: DisplayBoardComponent,
  },
  {
    path: 'track/:orderId',
    component: TrackingPageComponent,
  },
  {
    path: 'mechanic',
    component: MechanicTerminalComponent,
  },
  {
    path: 'join',
    component: QrJoinFormComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
