import { PrismaService } from '@/lib/prisma/prisma.service';
import { TaskService } from '@/main/task/task.service';
import { Injectable } from '@nestjs/common';
import {
  InvoiceStatus,
  InvoiceType,
  PaymentStatus,
  PostingStatus,
  TaskStatus,
} from '@prisma';

@Injectable()
export class FinanceDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskService: TaskService,
  ) {}

  async getTopOverview() {
    const totalInvoices = await this.prisma.client.invoice.count();

    const pendingPayments = await this.prisma.client.payment.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: { equals: PaymentStatus.PENDING } },
    });

    const paidPayments = await this.prisma.client.payment.aggregate({
      _sum: { amount: true },
      where: { paymentStatus: { equals: PaymentStatus.COMPLETED } },
    });

    const dueVat = await this.prisma.client.invoice.aggregate({
      _sum: { vatAmount: true },
      where: { invoiceStatus: { equals: InvoiceStatus.DUE } },
    });

    return {
      totalInvoices: totalInvoices || 0,
      pendingPayments: pendingPayments._sum.amount || 0,
      paidPayments: paidPayments._sum.amount || 0,
      dueVat: dueVat._sum.vatAmount || 0,
    };
  }

  async getStatistics() {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Fetch invoices (Prisma only)
    const invoices = await this.prisma.client.invoice.findMany({
      where: {
        invoiceDate: {
          gte: startDate,
          lte: now,
        },
        invoiceStatus: {
          not: 'PENDING',
        },
      },
      select: {
        invoiceDate: true,
        invoiceType: true,
        amount: true,
        discount: true,
        vatAmount: true,
      },
    });

    // Prepare last 12 month buckets
    const monthlyMap = new Map<
      string,
      {
        month: string;
        income: number;
        expense: number;
      }
    >();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      monthlyMap.set(key, {
        month: d.toLocaleString('en-US', { month: 'short' }), // Jan, Feb
        income: 0,
        expense: 0,
      });
    }

    // Aggregate invoices
    for (const invoice of invoices) {
      const d = new Date(invoice.invoiceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const bucket = monthlyMap.get(key);
      if (!bucket) continue;

      const total =
        Number(invoice.amount) -
        Number(invoice.discount ?? 0) +
        Number(invoice.vatAmount ?? 0);

      if (invoice.invoiceType === InvoiceType.SELLS) {
        bucket.income += total;
      } else if (invoice.invoiceType === InvoiceType.EXPENSE) {
        bucket.expense += total;
      }
    }

    // 4️ Return chart-ready array
    return Array.from(monthlyMap.values()).map((item) => ({
      month: item.month,
      income: Number(item.income.toFixed(2)),
      expense: Number(item.expense.toFixed(2)),
    }));
  }

  async getManagementReportingTop() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const thisMonthPaidAmount = await this.prisma.client.invoice.aggregate({
      _sum: { amount: true },
      where: {
        invoiceStatus: 'PAID',
        invoiceDate: {
          gte: startOfMonth,
          lte: todayEnd,
        },
      },
    });

    const thisMonthDueAmount = await this.prisma.client.invoice.aggregate({
      _sum: { amount: true },
      where: {
        invoiceStatus: 'DUE',
        invoiceDate: {
          gte: startOfMonth,
          lte: todayEnd,
        },
      },
    });

    const totalRevenue = await this.prisma.client.invoice.aggregate({
      _sum: { amount: true },
      where: { invoiceType: { equals: InvoiceType.SELLS } },
    });

    const totalReserve = await this.prisma.client.cash.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      thisMonthPaidAmount: thisMonthPaidAmount._sum.amount || 0,
      thisMonthDueAmount: thisMonthDueAmount._sum.amount || 0,
      totalReserve: totalReserve || 0,
    };
  }

  async getMidDashboard() {
    const completeTasks = await this.prisma.client.task.count({
      where: { status: TaskStatus.COMPLETED },
    });

    const incompleteTasks = await this.prisma.client.task.count({
      where: { status: TaskStatus.NOT_COMPLETED },
    });

    const inProgressTasks = await this.prisma.client.task.count({
      where: { status: TaskStatus.IN_PROGRESS },
    });

    const pendingInvoices = await this.prisma.client.invoice.count({
      where: { invoiceStatus: InvoiceStatus.PENDING },
    });

    const overdueInvoices = await this.prisma.client.invoice.count({
      where: { invoiceStatus: InvoiceStatus.DUE },
    });

    return {
      completeTasks,
      incompleteTasks,
      inProgressTasks,
      pendingInvoices,
      overdueInvoices,
    };
  }

  async getRecentTasksDashboard(userId: string) {
    return this.taskService.getMyRecentTask(userId);
  }

  async getManagementReportingBottom() {
    // Get all PAID invoices grouped by month
    const paidInvoices = await this.prisma.client.invoice.findMany({
      where: {
        invoiceStatus: InvoiceStatus.PAID,
      },
      select: {
        invoiceDate: true,
        invoiceType: true,
        amount: true,
      },
      orderBy: {
        invoiceDate: 'desc',
      },
    });

    // Group invoices by month and calculate revenue/expense
    const monthlyMap = new Map<
      string,
      {
        period: string;
        revenue: number;
        expense: number;
        date: Date;
      }
    >();

    for (const invoice of paidInvoices) {
      const date = new Date(invoice.invoiceDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(monthKey)) {
        const monthName = date.toLocaleString('en-US', { month: 'long' });
        const year = date.getFullYear();
        monthlyMap.set(monthKey, {
          period: `${monthName} ${year}`,
          revenue: 0,
          expense: 0,
          date,
        });
      }

      const bucket = monthlyMap.get(monthKey)!;
      const amount = Number(invoice.amount);

      if (invoice.invoiceType === InvoiceType.SELLS) {
        bucket.revenue += amount;
      } else if (invoice.invoiceType === InvoiceType.EXPENSE) {
        bucket.expense += amount;
      }
    }

    // Convert to array and sort by date descending (latest first)
    const result = Array.from(monthlyMap.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(({ period, revenue, expense }) => ({
        period,
        Revenue: Number(revenue.toFixed(2)),
        Expense: Number(expense.toFixed(2)),
        LossProfit: Number((revenue - expense).toFixed(2)),
      }));

    return result;
  }

  async getFinanceStatements() {
    const totalAccrualDeferralCount =
      await this.prisma.client.accrualDeferral.count();

    const completedAccrualDeferralCount =
      await this.prisma.client.accrualDeferral.count({
        where: { status: PostingStatus.POSTED },
      });

    const totalProvisionCount = await this.prisma.client.provision.count();

    const completedProvisionCount = await this.prisma.client.provision.count({
      where: { provisionStatus: PostingStatus.POSTED },
    });

    const totalVatReportCount = await this.prisma.client.vatReport.count();

    const attached_documentCount = await this.prisma.client.vatReport.count({
      where: { documentId: { not: null } },
    });

    return {
      accrual_deferral: `${completedAccrualDeferralCount}/${totalAccrualDeferralCount}`,
      provision: `${completedProvisionCount}/${totalProvisionCount}`,
      document_attached: `${attached_documentCount}/${totalVatReportCount}`,
    };
  }

  async getFinanceStatementsDetailed() {
    const revenueAgg = await this.prisma.client.invoice.aggregate({
      _sum: { amount: true },
      where: { invoiceType: InvoiceType.SELLS },
    });

    const expensesAgg = await this.prisma.client.invoice.aggregate({
      _sum: { amount: true },
      where: { invoiceType: InvoiceType.EXPENSE },
    });

    const revenue = revenueAgg._sum.amount || 0;
    const expenses = expensesAgg._sum.amount || 0;
    const netProfit = Number(revenue) - Number(expenses);

    return {
      revenue,
      expenses,
      netProfit,
    };
  }

  async getWeeklyFinanceSummary() {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const revenueResult = await this.prisma.client.invoice.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        invoiceType: 'SELLS',
        createdAt: {
          gte: sevenDaysAgo,
          lte: now,
        },
      },
    });

    const revenue = revenueResult._sum.amount?.toNumber() ?? 0;

    const expenseResult = await this.prisma.client.invoice.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        invoiceType: 'EXPENSE',
        createdAt: {
          gte: sevenDaysAgo,
          lte: now,
        },
      },
    });
    const expense = expenseResult._sum.amount?.toNumber() ?? 0;

    const overdueAmountResult = await this.prisma.client.invoice.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        invoiceStatus: 'DUE',
        createdAt: {
          gte: sevenDaysAgo,
          lte: now,
        },
      },
    });

    const overdueAmount = overdueAmountResult._sum.amount?.toNumber() ?? 0;

    const profit = revenue - expense;

    return {
      revenue,
      expense,
      profit,
      overdueAmount,
    };
  }

  async getWeeklyRevenue() {
    const now = new Date();
    const result = [];

    // Get last 7 days of revenue
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);

      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);

      // Get the day name (sat, sun, mon, etc.)
      const dayName = targetDate
        .toLocaleString('en-US', { weekday: 'short' })
        .toLowerCase();

      // Aggregate SELLS invoice amounts for this day
      const revenueResult = await this.prisma.client.invoice.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          invoiceType: InvoiceType.SELLS,
          invoiceStatus: InvoiceStatus.PAID,
          invoiceDate: {
            gte: targetDate,
            lt: nextDate,
          },
        },
      });

      const amount = revenueResult._sum.amount?.toNumber() ?? 0;

      // Add to result array
      result.push({
        [dayName]: amount,
      });
    }

    return result;
  }
}
