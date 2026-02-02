import { CloudinaryService } from '@/lib/file/services/cloudinary.service';
import { Module } from '@nestjs/common';
import { SmNotificationModule } from '../sm-notification/sm-notification.module';

import { FinanceDashboardModule } from './finance-dashboard/finance-dashboard.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { InvoiceReminderService } from './invoice-reminder.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { NotificationGateway } from '../sm-notification/gateway/sm-notification.gateway';

@Module({
  controllers: [FinanceController],
  providers: [
    FinanceService,
    InvoiceReminderService,
    CloudinaryService,
    PrismaService,
    NotificationGateway,
  ],
  exports: [FinanceService, InvoiceReminderService],
  imports: [FinanceDashboardModule, SmNotificationModule],
})
export class FinanceModule {}
