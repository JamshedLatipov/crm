import { Routes } from '@angular/router';
import { CampaignListComponent } from './campaign-list/campaign-list.component';
import { CampaignFormComponent } from './campaign-form/campaign-form.component';
import { ContactsUploadComponent } from './contacts-upload/contacts-upload.component';
import { CampaignStatisticsComponent } from './campaign-statistics/campaign-statistics.component';
import { ContactSourceSelectorComponent } from './contact-source-selector/contact-source-selector.component';

export const campaignsRoutes: Routes = [
  {
    path: '',
    component: CampaignListComponent,
  },
  {
    path: 'new',
    component: CampaignFormComponent,
  },
  {
    path: ':id/edit',
    component: CampaignFormComponent,
  },
  {
    path: ':id/contacts/upload',
    component: ContactsUploadComponent,
  },
  {
    path: ':id/contacts',
    component: ContactSourceSelectorComponent,
  },
  {
    path: ':id/statistics',
    component: CampaignStatisticsComponent,
  },
];
