import { Module } from '@nestjs/common';
import { ActivityModule } from './activity/activity.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentModule } from './document/document.module';
import { FinanceModule } from './finance/finance.module';
import { FolderModule } from './folder/folder.module';
import { ProjectModule } from './project/project.module';
import { SettingsModule } from './settings/settings.module';
import { TaskModule } from './task/task.module';
import { UserModule } from './user/user.module';
import { AiChatModule } from './ai-chat/ai-chat.module';
import { AiResourceModule } from './ai-resource/ai-resource.module';
import { PrivateMessageModule } from './private-message/private-message.module';
import { SmNotificationModule } from './sm-notification/sm-notification.module';

@Module({
  imports: [
    AuthModule,
    FolderModule,
    DocumentModule,
    ProjectModule,
    SettingsModule,
    PrivateMessageModule,
    TaskModule,
    UserModule,
    FinanceModule,
    AuditModule,
    ActivityModule,
    DashboardModule,
    AiChatModule,
    AiResourceModule,
    SmNotificationModule,
  ],
})
export class MainModule {}
