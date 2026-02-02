import { GetUserId } from '@/core/jwt/jwt.decorator';
import { JwtAuthGuard } from '@/core/jwt/jwt.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get admin dashboard overview',
    description:
      'Retrieve comprehensive admin dashboard data including top counts, income/expense stats, task activity, user statistics, recent audits, and activity time analytics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard data retrieved successfully',
    schema: {
      example: {
        topCounts: {
          usersCount: 150,
          documentsCount: 450,
          tasksCount: 89,
          totalRevenue: 500000.75,
        },
        incomeExpenseStats: [
          { month: 'Jan', income: 10000, expense: 5000 },
          { month: 'Feb', income: 12000, expense: 6000 },
        ],
        taskActivity: {
          completed: { count: 45, percentage: 50.56 },
          incomplete: { count: 10, percentage: 11.24 },
          inProgress: { count: 34, percentage: 38.2 },
          totalTasks: 89,
          totalActivityAverage: 50.56,
        },
        recentTasks: [
          {
            id: 'task_1',
            projectId: 'project_123',
            clientId: 'client_456',
            createdBy: 'admin_789',
            title: 'Review financial report',
            description: 'Complete monthly financial review and analysis',
            deadline: '2026-01-20T23:59:59.000Z',
            priority: 'HIGH',
            note: 'Urgent - Due end of month',
            status: 'IN_PROGRESS',
            isDeleted: false,
            createdAt: '2026-01-10T10:00:00.000Z',
            updatedAt: '2026-01-12T14:30:00.000Z',
            creator: {
              id: 'admin_789',
              fullName: 'Admin User',
              email: 'admin@example.com',
              role: 'ADMIN',
            },
            client: {
              id: 'client_456',
              fullName: 'Client Company',
              email: 'client@example.com',
            },
            project: {
              id: 'project_123',
              name: 'Q1 Financial Audit',
            },
          },
        ],
        userStats: {
          pending: 5,
          active: 120,
          inactive: 25,
          total: 150,
        },
        recentAudits: [
          {
            id: 'audit_1',
            userId: 'user_123',
            action: 'USER_LOGIN',
            createdAt: '2026-01-14T08:30:00.000Z',
            user: {
              id: 'user_123',
              fullName: 'John Doe',
              email: 'john@example.com',
              role: 'ADMIN',
            },
          },
        ],
        activityTimeStats: [
          {
            day: 'Mon',
            date: '2026-01-13',
            averageHours: 6.5,
            totalHours: 52.0,
          },
          {
            day: 'Tue',
            date: '2026-01-14',
            averageHours: 7.2,
            totalHours: 57.6,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAdminDashboard(@GetUserId() userId: string) {
    return this.dashboardService.getAdminDashboard(userId);
  }

  @Get('manager')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get manager dashboard overview',
    description:
      'Retrieve comprehensive manager dashboard data including top counts, task activity, user statistics, personal recent tasks, personal audits, and personal activity time analytics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Manager dashboard data retrieved successfully',
    schema: {
      example: {
        topCounts: {
          usersCount: 150,
          filesCount: 1200,
          myTasksCount: 15,
          teamTasksCount: 89,
        },
        taskActivity: {
          completed: { count: 45, percentage: 50.56 },
          incomplete: { count: 10, percentage: 11.24 },
          inProgress: { count: 34, percentage: 38.2 },
          totalTasks: 89,
          totalActivityAverage: 50.56,
        },
        userStats: {
          pending: 5,
          active: 120,
          inactive: 25,
          total: 150,
        },
        myRecentTasks: [
          {
            id: 'assignment_1',
            taskId: 'task_1',
            employeeId: 'user_123',
            assignedBy: 'manager_456',
            status: 'IN_PROGRESS',
            assignedAt: '2026-01-10T10:00:00.000Z',
            task: {
              id: 'task_1',
              title: 'Review financial report',
              description: 'Complete monthly review',
              deadline: '2026-01-15T23:59:59.000Z',
              priority: 'HIGH',
              status: 'IN_PROGRESS',
              createdAt: '2026-01-10T10:00:00.000Z',
              updatedAt: '2026-01-10T10:00:00.000Z',
            },
            assigner: {
              id: 'manager_456',
              fullName: 'Jane Manager',
              role: 'MANAGER',
              email: 'jane@example.com',
            },
          },
        ],
        myRecentAudits: [
          {
            id: 'audit_1',
            userId: 'user_123',
            action: 'TASK_CREATED',
            createdAt: '2026-01-14T08:30:00.000Z',
            user: {
              id: 'user_123',
              fullName: 'John Manager',
              email: 'john@example.com',
              role: 'MANAGER',
            },
          },
        ],
        myActivityTimeStats: [
          {
            day: 'Mon',
            date: '2026-01-13',
            hours: 7.5,
          },
          {
            day: 'Tue',
            date: '2026-01-14',
            hours: 8.2,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getManagerDashboard(@GetUserId() userId: string) {
    return this.dashboardService.getManagerDashboard(userId);
  }

  @Get('user')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get user dashboard overview',
    description:
      'Retrieve user-specific dashboard data including personal task activity, recent tasks, and personal activity time statistics.',
  })
  @ApiResponse({
    status: 200,
    description: 'User dashboard data retrieved successfully',
    schema: {
      example: {
        myTaskActivity: {
          completed: { count: 8, percentage: 53.33 },
          incomplete: { count: 2, percentage: 13.33 },
          inProgress: { count: 5, percentage: 33.33 },
          totalTasks: 15,
          totalActivityAverage: 53.33,
        },
        myRecentTasks: [
          {
            id: 'assignment_1',
            taskId: 'task_1',
            employeeId: 'user_123',
            assignedBy: 'manager_456',
            status: 'IN_PROGRESS',
            assignedAt: '2026-01-10T10:00:00.000Z',
            task: {
              id: 'task_1',
              title: 'Review financial report',
              description: 'Complete monthly review',
              deadline: '2026-01-15T23:59:59.000Z',
              priority: 'HIGH',
              status: 'IN_PROGRESS',
              createdAt: '2026-01-10T10:00:00.000Z',
              updatedAt: '2026-01-10T10:00:00.000Z',
            },
            assigner: {
              id: 'manager_456',
              fullName: 'Jane Manager',
              role: 'MANAGER',
              email: 'jane@example.com',
            },
          },
        ],
        myActivityTimeStats: [
          {
            day: 'Mon',
            date: '2026-01-13',
            hours: 7.5,
          },
          {
            day: 'Tue',
            date: '2026-01-14',
            hours: 8.2,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getUserDashboard(@GetUserId() userId: string) {
    return this.dashboardService.getUserDashboard(userId);
  }

  @Get('client')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get client dashboard overview',
    description:
      'Retrieve client dashboard data including recent notifications, invoices created for the client, and recent documents shared with the client.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client dashboard data retrieved successfully',
    schema: {
      example: {
        recentNotifications: [
          {
            notificationId: 'notif_1',
            type: 'invoice:created',
            title: 'New Invoice Created',
            message: 'Invoice INV-2025-0045 has been created',
            isRead: false,
            createdAt: '2026-01-28T10:00:00.000Z',
            meta: {
              invoiceId: 'inv_123',
              invoiceNumber: 'INV-2025-0045',
              amount: 2500,
              url: '/invoices/inv_123',
            },
          },
        ],
        recentInvoices: [
          {
            id: 'inv_123',
            invoiceType: 'SELLS',
            orgName: 'Client Company Ltd',
            description: 'Monthly service fee',
            amount: 2500,
            discount: 0,
            vat: 15,
            vatAmount: 375,
            invoiceDate: '2026-01-20T00:00:00.000Z',
            invoiceStatus: 'DUE',
            createdAt: '2026-01-20T10:00:00.000Z',
          },
        ],
        recentDocuments: [
          {
            id: 'doc_1',
            name: 'Project_Scope.pdf',
            documentCateory: 'PROJECT',
            statusByClient: 'PENDING',
            shareToClient: true,
            isSigned: false,
            createdAt: '2026-01-27T14:30:00.000Z',
            uploader: {
              id: 'user_123',
              fullName: 'John Doe',
              email: 'john@example.com',
            },
            project: {
              id: 'project_123',
              name: 'Website Redesign',
            },
          },
        ],
        summary: {
          totalNotifications: 15,
          unreadNotifications: 5,
          totalInvoices: 10,
          dueInvoices: 2,
          totalDocuments: 8,
          pendingDocuments: 3,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getClientDashboard(@GetUserId() userId: string) {
    return this.dashboardService.getClientDashboard(userId);
  }
}
