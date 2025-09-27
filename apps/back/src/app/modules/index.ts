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
];
