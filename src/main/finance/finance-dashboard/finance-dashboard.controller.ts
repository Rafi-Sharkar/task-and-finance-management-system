import { GetUserId } from '@/core/jwt/jwt.decorator';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FinanceDashboardService } from './finance-dashboard.service';
import { JwtAuthGuard } from '@/core/jwt/jwt.guard';
import { TaskService } from '@/main/task/task.service';

@ApiTags('Finance Dashboard')
@Controller('finance-dashboard')
export class FinanceDashboardController {
  constructor(
    private readonly financeDashboardService: FinanceDashboardService,
    private readonly taskService: TaskService,
  ) {}

  @Get('top-overview')
  @ApiOperation({
    summary:
      'Get finance dashboard top overview and management reporting/s profit loss statistics: Test_OK',
    description:
      'Retrieve top-level finance overview including total invoices, pending/paid payments, and due VAT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Finance overview data retrieved successfully',
    schema: {
      example: {
        totalInvoices: 45,
        pendingPayments: 15000.5,
        paidPayments: 125000.75,
        dueVat: 3500.25,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getTopOverview() {
    return this.financeDashboardService.getTopOverview();
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get finance dashboard statistics: Test_OK',
    description:
      'Retrieve finance statistics including income and expense over the last 12 months.',
  })
  @ApiResponse({
    status: 200,
    description: 'Finance statistics data retrieved successfully',
    schema: {
      example: [
        { month: 'Jan', income: 10000, expense: 5000 },
        { month: 'Feb', income: 12000, expense: 6000 },
        // ... more months
      ],
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getStatistics() {
    return this.financeDashboardService.getStatistics();
  }

  @Get('management-reporting-top')
  @ApiOperation({
    summary: 'Get management reporting top metrics: Test_OK',
    description:
      'Retrieve key management reporting metrics for the finance dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Management reporting top metrics retrieved successfully',
    schema: {
      example: {
        totalRevenue: 0,
        thisMonthPaidAmount: 0,
        thisMonthDueAmount: 0,
        totalReserve: 0,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getManagementReportingTop() {
    return this.financeDashboardService.getManagementReportingTop();
  }

  @Get('management-reporting-bottom')
  @ApiOperation({
    summary:
      'Get management reporting bottom metrics - Monthly profit/loss: Test_OK',
    description:
      'Retrieve monthly profit and loss reports based on paid invoices. Returns revenue (SELLS invoices), expense (EXPENSE invoices), and profit/loss for each month. Latest month appears first.',
  })
  @ApiResponse({
    status: 200,
    description: 'Management reporting bottom metrics retrieved successfully',
    schema: {
      example: [
        {
          period: 'January 2026',
          Revenue: 9878,
          Expense: 5453,
          LossProfit: 4425,
        },
        {
          period: 'December 2025',
          Revenue: 12500,
          Expense: 7800,
          LossProfit: 4700,
        },
      ],
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getManagementReportingBottom() {
    return this.financeDashboardService.getManagementReportingBottom();
  }

  @Get('mid-dashboard')
  @ApiOperation({
    summary: 'Get finance mid dashboard: Test_OK',
    description:
      'Retrieve mid-level finance dashboard data including task statistics and invoice counts.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Mid dashboard data retrieved successfully',
    schema: {
      example: {
        completeTasks: 25,
        incompleteTasks: 10,
        inProgressTasks: 15,
        pendingInvoices: 8,
        overdueInvoices: 3,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getMidDashboard() {
    return this.financeDashboardService.getMidDashboard();
  }

  @Get('recent-tasks-dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get recent finance tasks for dashboard: Test_OK',
    description:
      'Retrieve recently assigned finance-related tasks for the authenticated user for display on the dashboard with pagination support.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent tasks retrieved successfully',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'task_assignment_1',
            taskId: 'task_1',
            employeeId: 'user_123',
            assignedBy: 'manager_456',
            status: 'IN_PROGRESS',
            assignedAt: '2026-01-10T10:00:00.000Z',
            task: {
              id: 'task_1',
              title: 'Approve invoice #123',
              deadline: '2026-01-15T23:59:59.000Z',
              priority: 'HIGH',
              status: 'IN_PROGRESS',
              createdAt: '2026-01-10T10:00:00.000Z',
              updatedAt: '2026-01-10T10:00:00.000Z',
            },
            assigner: {
              id: 'manager_456',
              fullName: 'Jane Manager',
              role: 'ADMIN',
              email: 'jane@example.com',
            },
          },
        ],
        metadata: {
          total: 25,
          page: 1,
          limit: 10,
          totalPages: 3,
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getRecentTasksDashboard(
    @GetUserId() userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.taskService.getMyRecentTask(userId, page, limit);
  }

  @Get('finance-statements-top')
  @ApiOperation({
    summary: 'Get finance statements: Test_OK',
    description:
      'Retrieve a list of finance statements including invoices and payments.',
  })
  @ApiResponse({
    status: 200,
    description: 'Finance statements retrieved successfully',
    schema: {
      example: {
        accrual_deferral: '34/55',
        provision: '23/44',
        document_attached: '12/20',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getFinanceStatements() {
    return await this.financeDashboardService.getFinanceStatements();
  }

  @Get('finance-statements-bottom')
  @ApiOperation({
    summary: 'Get detailed finance statements: Test_OK',
    description:
      'Retrieve detailed finance statements including accruals, deferrals, provisions, and attached documents.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed finance statements retrieved successfully',
    schema: {
      example: {
        revenue: 1000000,
        expenses: 750000,
        netProfit: 250000,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getFinanceStatementsDetailed() {
    return await this.financeDashboardService.getFinanceStatementsDetailed();
  }

  @Get('weekly-finance-summary')
  @ApiOperation({
    summary: 'Get weekly finance summary: Test_OK',
    description:
      'Retrieve a summary of weekly financial activities including total income and expenses for the past week.',
  })
  @ApiResponse({
    status: 200,
    description: 'Weekly finance summary retrieved successfully',
    schema: {
      example: {
        revenue: 50000,
        expense: 30000,
        profit: 20000,
        overdueAmount: 5000,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getWeeklyFinanceSummary() {
    return await this.financeDashboardService.getWeeklyFinanceSummary();
  }

  @Get('weekly-revenue')
  @ApiOperation({
    summary: 'Get weekly revenue by day: Test_OK',
    description:
      'Retrieve daily revenue amounts from SELLS type invoices for the last 7 days. Returns an array with each day showing its revenue.',
  })
  @ApiResponse({
    status: 200,
    description: 'Weekly revenue data retrieved successfully',
    schema: {
      example: [
        { mon: 45664 },
        { tue: 65465 },
        { wed: 6545 },
        { thu: 78945 },
        { fri: 52300 },
        { sat: 43200 },
        { sun: 38900 },
      ],
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getWeeklyRevenue() {
    return await this.financeDashboardService.getWeeklyRevenue();
  }
}
