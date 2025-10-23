import { LeadModule } from "./leads/lead.module";
import { TaskModule } from "./tasks/task.module";
import { UserModule } from "./user/user.module";
import { CallsModule } from "./calls/calls.module";
import { AriModule } from "./ari/ari.module";
import { IvrModule } from "./ivr/ivr.module";
import { IvrMediaModule } from './ivr-media/ivr-media.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { DealsModule } from './deals/deals.module';
import { ContactsModule } from './contacts/contacts.module';
import { CompaniesModule } from './companies/companies.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationModule } from './notifications/notification.module';
import { SharedModule } from './shared/shared.module';
import { AdsIntegrationModule } from './ads-integration/ads-integration.module';
import { ReportsModule } from './reports/reports.module';
import { ContactCenterModule } from './contact-center/contact-center.module';

export const MODULES = [
    LeadModule,
    UserModule,
    TaskModule,
    CallsModule,
    AriModule,
    IvrModule,
    IvrMediaModule,
    PipelineModule,
    DealsModule,
    ContactsModule,
    CompaniesModule,
    CommentsModule,
    NotificationModule,
    SharedModule,
    AdsIntegrationModule,
    ReportsModule,
    ContactCenterModule,
];
