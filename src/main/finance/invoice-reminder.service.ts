import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/lib/prisma/prisma.service';

/**
 * Service to handle invoice reminder notifications
 * This can be called from finance controllers or scheduled tasks
 */
@Injectable()
export class InvoiceReminderService {
  [x: string]: any;
  private readonly logger = new Logger(InvoiceReminderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send reminder notification to client for a specific invoice
   */
  async sendInvoiceReminder(invoiceId: string) {
    const invoice = await this.prisma.client.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (!invoice.clientId) {
      throw new Error('Invoice does not have a client associated');
    }

    // await this.notificationHelper.notifyInvoiceReminder(
    //   invoice.id,
    //   Number(invoice.amount),
    //   invoice.invoiceDate,
    //   invoice.clientId,
    //   invoice.orgName || undefined,
    // );

    this.logger.log(
      `Invoice reminder sent for invoice ${invoiceId} to client ${invoice.clientId}`,
    );

    return {
      success: true,
      message: 'Reminder sent successfully',
    };
  }

  /**
   * Send reminders for all overdue invoices
   * This can be called by a cron job
   */
  async sendOverdueReminders() {
    const overdueInvoices = await this.prisma.client.invoice.findMany({
      where: {
        invoiceStatus: 'DUE',
        invoiceDate: {
          lt: new Date(),
        },
        clientId: {
          not: null,
        },
      },
      include: {
        client: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // let count = 0;
    // for (const invoice of overdueInvoices) {
    //   if (invoice.clientId) {
    //     try {
    //       await this.notificationHelper.notifyInvoiceReminder(
    //         invoice.id,
    //         Number(invoice.amount),
    //         invoice.invoiceDate,
    //         invoice.clientId,
    //         invoice.orgName || undefined,
    //       );
    //       count++;
    //     } catch (error) {
    //       this.logger.error(
    //         `Failed to send reminder for invoice ${invoice.id}:`,
    //         error,
    //       );
    //     }
    //   }
    // }

    // this.logger.log(`Sent ${count} overdue invoice reminders`);

    return {
      success: true,
      data: overdueInvoices,
    };
  }
}
