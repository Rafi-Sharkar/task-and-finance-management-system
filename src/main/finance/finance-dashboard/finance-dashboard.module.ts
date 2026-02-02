import { TaskModule } from '@/main/task/task.module';
import { Module } from '@nestjs/common';
import { FinanceDashboardController } from './finance-dashboard.controller';
import { FinanceDashboardService } from './finance-dashboard.service';

@Module({
  imports: [TaskModule],
  controllers: [FinanceDashboardController],
  providers: [FinanceDashboardService],
  exports: [FinanceDashboardService],
})
export class FinanceDashboardModule {}
