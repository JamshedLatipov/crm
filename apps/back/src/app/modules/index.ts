import { LeadModule } from "./leads/lead.module";
import { TaskModule } from "./tasks/task.module";
import { UserModule } from "./user/user.module";
import { CallsModule } from "./calls/calls.module";
import { AriModule } from "./ari/ari.module";
import { AmiModule } from './ami/ami.module';
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
import { PromoCompaniesModule } from './promo-companies/promo-companies.module';
import { CallScriptsModule } from './call-scripts/call-scripts.module';
import { UserActivityModule } from './user-activity/user-activity.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MessagesModule } from './messages/messages.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ForecastingModule } from './forecasting/forecasting.module';
import { RecordingsModule } from './recordings/recordings.module';
import { QueuesModule } from './queues/queues.module';
import { QueueConsumersModule } from './queues/queue-consumers.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { SegmentsModule } from './segments/segments.module';

export const MODULES = [
    QueuesModule, // Must be early for global availability
    CustomFieldsModule,
    SegmentsModule, // Universal contact segmentation for SMS, Campaigns, Email, etc.
    LeadModule,
    UserModule,
    TaskModule,
    CallsModule,
    AriModule,
    AmiModule,
    IvrModule,
    IvrMediaModule,
    PipelineModule,
    DealsModule,
    ContactsModule,
    CompaniesModule,
    CommentsModule,
    MessagesModule, // Message hub - handles /messages/* routes (WhatsApp, Telegram, SMS, Email)
    NotificationModule,
    SharedModule,
    AdsIntegrationModule,
    ReportsModule,
    ContactCenterModule,
    PromoCompaniesModule,
    CallScriptsModule,
    UserActivityModule,
    IntegrationsModule,
    AnalyticsModule,
    ForecastingModule,
    RecordingsModule,
    QueueConsumersModule, // Must be LAST - uses ModuleRef to get services from other modules
];
