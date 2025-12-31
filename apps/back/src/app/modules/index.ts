// Modules migrated to microservices are commented out
// Lead → lead-service, User → identity-service, Task → task-service
// Deals/Pipeline → deal-service, Contacts/Companies → contact-service
// Notifications → notification-service, Calls/ARI/AMI/IVR/Queues → telephony-service
// Analytics/Reports → analytics-service

// import { LeadModule } from "./leads/lead.module";
// import { TaskModule } from "./tasks/task.module";
// import { UserModule } from "./user/user.module";
// import { CallsModule } from "./calls/calls.module";
// import { AriModule } from "./ari/ari.module";
// import { AmiModule } from './ami/ami.module';
// import { IvrModule } from "./ivr/ivr.module";
import { IvrMediaModule } from './ivr-media/ivr-media.module';
// import { PipelineModule } from './pipeline/pipeline.module';
// import { DealsModule } from './deals/deals.module';
// import { ContactsModule } from './contacts/contacts.module';
// import { CompaniesModule } from './companies/companies.module';
import { CommentsModule } from './comments/comments.module';
// import { NotificationModule } from './notifications/notification.module';
import { SharedModule } from './shared/shared.module';
import { AdsIntegrationModule } from './ads-integration/ads-integration.module';
// import { ReportsModule } from './reports/reports.module';
import { ContactCenterModule } from './contact-center/contact-center.module';
import { PromoCompaniesModule } from './promo-companies/promo-companies.module';
import { CallScriptsModule } from './call-scripts/call-scripts.module';
import { UserActivityModule } from './user-activity/user-activity.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SmsModule } from './sms/sms.module';
// import { AnalyticsModule } from './analytics/analytics.module';
import { ForecastingModule } from './forecasting/forecasting.module';
import { RecordingsModule } from './recordings/recordings.module';
// import { QueuesModule } from './queues/queues.module';
// import { QueueConsumersModule } from './queues/queue-consumers.module';

export const MODULES = [
    // Modules migrated to microservices:
    // QueuesModule,        → telephony-service
    // LeadModule,          → lead-service
    // UserModule,          → identity-service
    // TaskModule,          → task-service
    // CallsModule,         → telephony-service
    // AriModule,           → telephony-service
    // AmiModule,           → telephony-service
    // IvrModule,           → telephony-service
    // PipelineModule,      → deal-service
    // DealsModule,         → deal-service
    // ContactsModule,      → contact-service
    // CompaniesModule,     → contact-service
    // NotificationModule,  → notification-service
    // ReportsModule,       → analytics-service
    // AnalyticsModule,     → analytics-service
    // QueueConsumersModule → telephony-service
    
    // Modules kept in monolith:
    SharedModule,
    IvrMediaModule,
    CommentsModule,
    AdsIntegrationModule,
    ContactCenterModule,
    PromoCompaniesModule,
    CallScriptsModule,
    UserActivityModule,
    IntegrationsModule,
    SmsModule,
    ForecastingModule,
    RecordingsModule,
];
