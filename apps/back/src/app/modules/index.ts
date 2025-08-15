import { LeadModule } from "./leads/lead.module";
import { TaskModule } from "./tasks/task.module";
import { UserModule } from "./user/user.module";
import { CallsModule } from "./calls/calls.module";
import { AriModule } from "./ari/ari.module";
import { IvrModule } from "./ivr/ivr.module";

export const MODULES = [
    LeadModule,
    UserModule,
    TaskModule,
    CallsModule,
    AriModule,
    IvrModule,
];
