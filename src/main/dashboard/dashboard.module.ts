import { ActivityModule } from '@/main/activity/activity.module';
import { FinanceDashboardModule } from '@/main/finance/finance-dashboard/finance-dashboard.module';
import { TaskModule } from '@/main/task/task.module';
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TaskModule, FinanceDashboardModule, ActivityModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
