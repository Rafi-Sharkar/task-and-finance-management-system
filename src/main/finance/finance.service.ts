import { JWTPayload } from '@/core/jwt/jwt.interface';
import { CloudinaryService } from '@/lib/file/services/cloudinary.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DocumentStatus, InvoiceStatus, PostingStatus } from '@prisma';

import { CreateAccrualDeferralDto } from './dto/createAccrualDeferral.dto';
import { CreateCashDto } from './dto/createCash.dto';
import { CreateInvoiceDto } from './dto/createInvoice.dto';
import { CreatePaymentDto } from './dto/createPayment.dto';
import { CreateProvisionDto } from './dto/createProvision.dto';
import { CreateTransactionDto } from './dto/createTransaction.dto';
import { CreateVatReturnDto } from './dto/createVatReturn.dto';
import { InvoiceReminderService } from './invoice-reminder.service';

interface CreateTransactionWithFilesInput {
  dto: CreateTransactionDto;
  user: JWTPayload;
  files?: Express.Multer.File[];
}

interface CreateCashWithFilesInput {
  dto: CreateCashDto;
  user: JWTPayload;
  files?: Express.Multer.File[];
}

interface CreateInvoiceInput {
  dto: CreateInvoiceDto;
  user: JWTPayload;
}

interface CreateProvisionInput {
  dto: CreateProvisionDto;
  user: JWTPayload;
}

interface CreateVatReturnInput {
  dto: CreateVatReturnDto;
  user: JWTPayload;
}

interface CreatePaymentInput {
  dto: CreatePaymentDto;
  user: JWTPayload;
  files?: Express.Multer.File[];
}

interface CreateAccrualDeferralInput {
  dto: CreateAccrualDeferralDto;
  user: JWTPayload;
}

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notificationService: InvoiceReminderService,
  ) {}

  async createTransaction(input: CreateTransactionWithFilesInput) {
    const { dto, user, files } = input;

    // Validate input
    if (!user?.sub) {
      throw new BadRequestException('User information is required');
    }

    if (!dto || !dto.amount || !dto.transactionType || !dto.paymentMethod) {
      throw new BadRequestException('Invalid transaction data');
    }

    try {
      // Get or create the 'finance' folder
      let financeFolder = await this.prisma.client.folder.findFirst({
        where: {
          name: 'finance',
          createdBy: user.sub,
        },
      });

      if (!financeFolder) {
        financeFolder = await this.prisma.client.folder.create({
          data: {
            name: 'finance',
            createdBy: user.sub,
          },
        });
      }

      // Upload files to Cloudinary and prepare file data
      const uploadedFileData: Array<{
        url: string;
        mimeType: string;
        sizeKB: number;
        extension: string;
        checksum?: string;
      }> = [];

      if (files && files.length > 0) {
        this.logger.log(`Uploading ${files.length} files to Cloudinary...`);

        const uploadResults = await this.cloudinaryService.uploadFiles(
          files,
          'finance',
        );

        for (let i = 0; i < uploadResults.length; i++) {
          const result = uploadResults[i];
          const file = files[i];

          uploadedFileData.push({
            url: result.secure_url,
            mimeType: file.mimetype,
            sizeKB: Math.ceil(file.size / 1024),
            extension: result.format,
            checksum: result.public_id, // Store public_id for reference/deletion later
          });
        }
      }

      // Create document with transaction and files
      const document = await this.prisma.client.document.create({
        data: {
          folderId: financeFolder.id,
          uploadedBy: user.sub,
          name: `Transaction_${Date.now()}`,
          status: 'PENDING',
          documentCateory: 'TRANSACTION',
          transaction: {
            create: {
              transactionType: dto.transactionType,
              amount: dto.amount.toString(),
              transactionDate: dto.transactionDate,
              paymentMethod: dto.paymentMethod,
              description: dto.description,
              invoice: dto.invoiceId
                ? { connect: { id: dto.invoiceId } }
                : undefined,
            },
          },
          // Create file records for each uploaded file
          files: {
            create: uploadedFileData,
          },
        },
        include: {
          transaction: true,
          files: true,
        },
      });

      await this.prisma.client.bankReconciliation.update({
        where: { invoiceId: dto.invoiceId },
        data: {
          backAmount: parseFloat(dto.amount.toString()),
        },
      });

      const banckReconciliation =
        await this.prisma.client.bankReconciliation.findUnique({
          where: { invoiceId: dto.invoiceId },
        });

      if (
        banckReconciliation &&
        banckReconciliation.ledgerAmount &&
        banckReconciliation.backAmount
      ) {
        if (
          banckReconciliation.ledgerAmount === banckReconciliation.backAmount
        ) {
          await this.prisma.client.bankReconciliation.update({
            where: { invoiceId: dto.invoiceId },
            data: {
              reconciliationStatus: 'MATCH',
            },
          });
        } else {
          await this.prisma.client.bankReconciliation.update({
            where: { invoiceId: dto.invoiceId },
            data: {
              reconciliationStatus: 'ADJUSTMENT',
            },
          });
        }
      }

      return {
        success: true,
        data: document,
        message: `Transaction created with ${uploadedFileData.length} file(s)`,
      };
    } catch (error) {
      this.logger.error('Error creating transaction:', error);

      // If files were uploaded but document creation failed, attempt cleanup
      if (input.files && input.files.length > 0) {
        this.logger.warn(
          'Attempting to cleanup uploaded files due to error...',
        );
        // In a production scenario, you might want to delete the uploaded files
        // But for now, we'll just log the error
      }

      throw new BadRequestException(
        `Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async searchTransactions(search?: string, page?: number, limit?: number) {
    try {
      // Calculate pagination
      const pageNum = page && page > 0 ? Number(page) : 1;
      const limitNum = limit && limit > 0 ? Number(limit) : 10;
      const skip = (pageNum - 1) * limitNum;

      // Get total count for pagination metadata
      const total = await this.prisma.client.transaction.count({
        where: {
          invoice: {
            id: { contains: search },
          },
        },
      });

      // Get paginated transactions with document and files
      const transactions = await this.prisma.client.transaction.findMany({
        where: {
          invoice: {
            id: { contains: search },
          },
        },
        include: {
          document: {
            include: {
              files: {
                where: { isDeleted: false },
              },
            },
          },
          invoice: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limitNum,
      });

      return {
        success: true,
        data: transactions,
        metadata: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error('Error searching transactions:', error);
      throw new BadRequestException(
        `Failed to search transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateTransaction(transactionId: string, amount: number) {
    try {
      // Validate input
      if (!transactionId || !transactionId.trim()) {
        throw new BadRequestException('Transaction ID is required');
      }

      if (!amount || amount <= 0) {
        throw new BadRequestException('Amount must be a positive number');
      }

      // Find the transaction
      const transaction = await this.prisma.client.transaction.findUnique({
        where: { id: transactionId.trim() },
      });

      if (!transaction) {
        throw new BadRequestException(
          `Transaction with ID ${transactionId} not found`,
        );
      }

      // Update transaction amount
      const updatedTransaction = await this.prisma.client.transaction.update({
        where: { id: transactionId.trim() },
        data: {
          amount,
        },
      });

      this.logger.log(
        `Transaction amount updated successfully for ID: ${transactionId}. Old amount: ${transaction.amount}, New amount: ${amount}`,
      );

      return {
        success: true,
        data: updatedTransaction,
        message: `Transaction amount updated from ${transaction.amount} to ${amount}`,
      };
    } catch (error) {
      this.logger.error('Error updating transaction:', error);
      throw new BadRequestException(
        `Failed to update transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async createCash(input: CreateCashWithFilesInput) {
    const { dto, user, files } = input;

    // Validate input
    if (!user?.sub) {
      throw new BadRequestException('User information is required');
    }

    try {
      // Get or create the 'cash' folder
      let cashFolder = await this.prisma.client.folder.findFirst({
        where: {
          name: 'cash',
          createdBy: user.sub,
        },
      });

      if (!cashFolder) {
        cashFolder = await this.prisma.client.folder.create({
          data: {
            name: 'cash',
            createdBy: user.sub,
          },
        });
      }

      // Upload files to Cloudinary and prepare file data
      const uploadedFileData: Array<{
        url: string;
        mimeType: string;
        sizeKB: number;
        extension: string;
        checksum?: string;
      }> = [];

      if (files && files.length > 0) {
        this.logger.log(`Uploading ${files.length} files to Cloudinary...`);

        const uploadResults = await this.cloudinaryService.uploadFiles(
          files,
          'cash',
        );

        for (let i = 0; i < uploadResults.length; i++) {
          const result = uploadResults[i];
          const file = files[i];

          uploadedFileData.push({
            url: result.secure_url,
            mimeType: file.mimetype,
            sizeKB: Math.ceil(file.size / 1024),
            extension: result.format,
            checksum: result.public_id,
          });
        }
      }

      // Create cash record first
      const cashRecord = await this.prisma.client.cash.create({
        data: {
          referenceNo: dto.invoiceId,
          cashType: dto.cashType,
          cashIn: dto.cashIn ? dto.cashIn : undefined,
          cashOut: dto.cashOut ? dto.cashOut : undefined,
          totalbalance: dto.balance ? dto.balance : undefined,
          cashDate: new Date(dto.cashDate),
          description: dto.description,
        },
      });

      // Create document with cash and files
      const document = await this.prisma.client.document.create({
        data: {
          folderId: cashFolder.id,
          uploadedBy: user.sub,
          name: `Cash_${Date.now()}`,
          status: DocumentStatus.PENDING,
          documentCateory: 'CASH_MANAGEMENT',
          cashId: cashRecord.id,
          // Create file records for each uploaded file
          files: {
            create: uploadedFileData,
          },
        },
        include: {
          cash: true,
          files: true,
        },
      });

      this.logger.log(
        `Cash created successfully: ${document.id} with ${uploadedFileData.length} files`,
      );

      return {
        success: true,
        data: document,
        message: `Cash record created with ${uploadedFileData.length} file(s)`,
      };
    } catch (error) {
      this.logger.error('Error creating cash:', error);

      if (input.files && input.files.length > 0) {
        this.logger.warn(
          'Attempting to cleanup uploaded files due to error...',
        );
      }

      throw new BadRequestException(
        `Failed to create cash: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async searchCash(search?: string, page?: number, limit?: number) {
    try {
      // Calculate pagination
      const pageNum = page && page > 0 ? Number(page) : 1;
      const limitNum = limit && limit > 0 ? Number(limit) : 10;
      const skip = (pageNum - 1) * limitNum;

      // Get total count for pagination metadata
      const total = await this.prisma.client.cash.count({
        where: {
          referenceNo: search,
        },
      });

      // Get paginated transactions with document and files
      const cash = await this.prisma.client.cash.findMany({
        where: {
          referenceNo: search,
        },
        include: {
          document: {
            include: {
              files: {
                where: { isDeleted: false },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limitNum,
      });

      return {
        success: true,
        data: cash,
        metadata: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error('Error searching cash records:', error);
      throw new BadRequestException(
        `Failed to search cash records: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateCash(
    cashId: string,
    cashIn?: number,
    cashOut?: number,
    totalbalance?: number,
  ) {
    try {
      // Validate input
      if (!cashId || !cashId.trim()) {
        throw new BadRequestException('Cash ID is required');
      }

      // Find the cash record
      const cash = await this.prisma.client.cash.findUnique({
        where: { id: cashId.trim() },
      });

      if (!cash) {
        throw new BadRequestException(
          `Cash record with ID ${cashId} not found`,
        );
      }

      // Build update data with only provided fields
      const updateData: any = {};

      if (cashIn !== undefined) {
        if (cashIn < 0) {
          throw new BadRequestException('Cash In amount cannot be negative');
        }
        updateData.cashIn = cashIn;
      }

      if (cashOut !== undefined) {
        if (cashOut < 0) {
          throw new BadRequestException('Cash Out amount cannot be negative');
        }
        updateData.cashOut = cashOut;
      }

      if (totalbalance !== undefined) {
        if (totalbalance < 0) {
          throw new BadRequestException('Total balance cannot be negative');
        }
        updateData.totalbalance = totalbalance;
      }

      // Check if at least one field is being updated
      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException(
          'At least one field (cashIn, cashOut, or totalbalance) must be provided for update',
        );
      }

      // Update the cash record
      const updatedCash = await this.prisma.client.cash.update({
        where: { id: cashId },
        data: updateData,
      });

      this.logger.log(`Cash record updated successfully for ID: ${cashId}`);

      return {
        success: true,
        data: {
          id: updatedCash.id,
          referenceNo: updatedCash.referenceNo,
          cashType: updatedCash.cashType,
          cashIn: updatedCash.cashIn,
          cashOut: updatedCash.cashOut,
          totalbalance: updatedCash.totalbalance,
          cashDate: updatedCash.cashDate,
          description: updatedCash.description,
          createdAt: updatedCash.createdAt,
          updatedAt: updatedCash.updatedAt,
        },
        message: `Cash record updated successfully`,
      };
    } catch (error) {
      this.logger.error('Error updating cash record:', error);
      throw new BadRequestException(
        `Failed to update cash record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async createProvision(input: CreateProvisionInput) {
    const { dto, user } = input;

    // Validate input
    if (!user?.sub) {
      throw new BadRequestException('User information is required');
    }

    if (
      !dto ||
      !dto.name ||
      dto.amount === undefined ||
      dto.expectedValue === undefined ||
      !dto.startDate ||
      !dto.endDate ||
      dto.probability === undefined ||
      !dto.provisionStatus
    ) {
      throw new BadRequestException('Invalid provision data');
    }

    try {
      // Create provision record
      const provisionRecord = await this.prisma.client.provision.create({
        data: {
          name: dto.name,
          amount: dto.amount,
          expectedValue: dto.expectedValue,
          description: dto.description,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          probability: dto.probability,
          provisionStatus: dto.provisionStatus,
        },
      });

      this.logger.log(`Provision created successfully: ${provisionRecord.id}`);

      return {
        success: true,
        data: provisionRecord,
        message: 'Provision created successfully',
      };
    } catch (error) {
      this.logger.error('Error creating provision:', error);

      throw new BadRequestException(
        `Failed to create provision: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async searchProvisions(
    name?: string,
    provisionStatus?: string,
    page?: number,
    limit?: number,
  ) {
    try {
      // Pagination defaults
      const currentPage = page && page > 0 ? page : 1;
      const pageSize = limit && limit > 0 ? limit : 10;
      const skip = (currentPage - 1) * pageSize;

      // Build where clause
      const where: any = {
        isDeleted: false,
      };

      // Add name filter if provided
      if (name && name.trim()) {
        where.name = {
          contains: name.trim(),
          mode: 'insensitive',
        };
      }

      // Add provisionStatus filter if provided
      if (provisionStatus) {
        where.provisionStatus = provisionStatus;
      }

      // Get total count
      const total = await this.prisma.client.provision.count({ where });

      // Get filtered provisions ordered by creation date with pagination
      const provisions = await this.prisma.client.provision.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      });

      const totalPages = Math.ceil(total / pageSize);

      return {
        success: true,
        data: provisions,
        metadata: {
          total,
          page: currentPage,
          limit: pageSize,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Error searching provisions:', error);
      throw new BadRequestException(
        `Failed to search provisions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getDraftProvisionsSummary() {
    try {
      // Get all DRAFT provisions
      const totalCount = await this.prisma.client.provision.count({
        where: {
          provisionStatus: { equals: PostingStatus.DRAFT },
        },
      });

      // Calculate total amount
      const totalAmount = await this.prisma.client.provision.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          provisionStatus: { equals: PostingStatus.DRAFT },
        },
      });

      return {
        success: true,
        data: {
          totalCount,
          totalAmount: totalAmount._sum.amount || 0,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching draft provisions summary:', error);
      throw new BadRequestException(
        `Failed to fetch draft provisions summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateProvision(provisionId: string, updateData: any) {
    try {
      // Validate provisionId
      if (!provisionId || !provisionId.trim()) {
        throw new BadRequestException('Provision ID is required');
      }

      // Check if provision exists
      const provision = await this.prisma.client.provision.findUnique({
        where: { id: provisionId },
      });

      if (!provision) {
        throw new BadRequestException(
          `Provision with ID "${provisionId}" not found`,
        );
      }

      // Build update data object
      const dataToUpdate: any = {};

      if (updateData.name !== undefined) {
        dataToUpdate.name = updateData.name;
      }
      if (updateData.amount !== undefined) {
        dataToUpdate.amount = updateData.amount;
      }
      if (updateData.expectedValue !== undefined) {
        dataToUpdate.expectedValue = updateData.expectedValue;
      }
      if (updateData.startDate !== undefined) {
        dataToUpdate.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate !== undefined) {
        dataToUpdate.endDate = new Date(updateData.endDate);
      }
      if (updateData.probability !== undefined) {
        dataToUpdate.probability = updateData.probability;
      }
      if (updateData.provisionStatus !== undefined) {
        dataToUpdate.provisionStatus = updateData.provisionStatus;
      }
      if (updateData.description !== undefined) {
        dataToUpdate.description = updateData.description;
      }

      // Check if there's anything to update
      if (Object.keys(dataToUpdate).length === 0) {
        throw new BadRequestException('No valid fields provided for update');
      }

      // Update the provision
      const updatedProvision = await this.prisma.client.provision.update({
        where: { id: provisionId },
        data: dataToUpdate,
      });

      this.logger.log(`Provision ${provisionId} updated successfully`);

      return {
        success: true,
        data: updatedProvision,
        message: 'Provision updated successfully',
      };
    } catch (error) {
      this.logger.error('Error updating provision:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update provision: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteProvisionPermanently(provisionId: string) {
    try {
      // Validate provisionId
      if (!provisionId || !provisionId.trim()) {
        throw new BadRequestException('Provision ID is required');
      }

      // Check if provision exists
      const provision = await this.prisma.client.provision.findUnique({
        where: { id: provisionId },
      });

      if (!provision) {
        throw new BadRequestException(
          `Provision with ID "${provisionId}" not found`,
        );
      }

      // Permanently delete the provision
      await this.prisma.client.provision.delete({
        where: { id: provisionId },
      });

      this.logger.log(`Provision ${provisionId} permanently deleted`);

      return {
        success: true,
        message: 'Provision permanently deleted successfully',
      };
    } catch (error) {
      this.logger.error('Error deleting provision:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete provision: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async createInvoice(input: CreateInvoiceInput) {
    const { dto, user } = input;

    // Validate input
    if (!user?.sub) {
      throw new BadRequestException('User information is required');
    }

    if (
      !dto ||
      !dto.invoiceType ||
      dto.amount === undefined ||
      !dto.invoiceDate
    ) {
      throw new BadRequestException('Invalid invoice data');
    }

    if (dto.invoiceType === 'SELLS') {
      dto.supplierName = '';

      // Validate clientId exists for SELLS invoices
      if (dto.clientId && dto.clientId.trim()) {
        const clientExists = await this.prisma.client.user.findUnique({
          where: { id: dto.clientId.trim() },
        });

        if (!clientExists) {
          throw new BadRequestException(
            `Client with ID ${dto.clientId} not found`,
          );
        }
      }
    } else {
      // For EXPENSE invoices, don't use clientId
      dto.clientId = undefined;
    }

    try {
      // Get or create the 'finance' folder
      let financeFolder = await this.prisma.client.folder.findFirst({
        where: {
          name: 'finance',
          createdBy: user.sub,
        },
      });

      if (!financeFolder) {
        financeFolder = await this.prisma.client.folder.create({
          data: {
            name: 'finance',
            createdBy: user.sub,
          },
        });
      }
      const vatAmount = ((dto.vat ? dto.vat : 0) * dto.amount) / 100;

      // Create invoice record first
      const invoice = await this.prisma.client.invoice.create({
        data: {
          invoiceType: dto.invoiceType,
          clientId:
            dto.clientId && dto.clientId.trim()
              ? dto.clientId.trim()
              : undefined,
          supplierName: dto.supplierName,
          description: dto.description || '',
          amount: dto.amount,
          discount: dto.discount ? dto.discount : 0,
          vat: dto.vat ? dto.vat : 0,
          vatAmount: vatAmount,
          invoiceDate: new Date(dto.invoiceDate),
        },
      });

      // Determine vendor based on invoice type
      let vendor: string;
      if (invoice.invoiceType === 'SELLS') {
        vendor = invoice.clientId || 'Unknown';
      } else if (invoice.invoiceType === 'EXPENSE') {
        vendor = invoice.supplierName || 'Unknown';
      } else {
        vendor = 'Unknown';
      }

      // Automatically create BankReconciliation record
      await this.prisma.client.bankReconciliation.create({
        data: {
          invoiceId: invoice.id,
          vendor,
        },
      });

      this.logger.log(
        `Invoice created successfully: ${invoice.id} with BankReconciliation record`,
      );

      // Send notification to client if it's a SELLS invoice
      if (invoice.invoiceType === 'SELLS' && invoice.clientId) {
        await this.notificationService.notifyInvoiceCreation(
          invoice.clientId,
          invoice.id,
          invoice.amount,
        );
      }

      // Send notification to finance team (not employees)
      const creator = await this.prisma.client.user.findUnique({
        where: { id: user.sub },
        select: { fullName: true, email: true },
      });

      const client = dto.clientId
        ? await this.prisma.client.user.findUnique({
            where: { id: dto.clientId },
            select: { id: true, fullName: true, email: true },
          })
        : null;

      return {
        success: true,
        data: invoice,
        message: 'Invoice created successfully',
      };
    } catch (error) {
      this.logger.error('Error creating invoice:', error);

      throw new BadRequestException(
        `Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getInvoices(
    search?: string,
    invoiceType?: string,
    clientId?: string,
    invoiceStatus?: string,
    page?: number,
    limit?: number,
  ) {
    try {
      // Update expired invoices to DUE status
      const currentDate = new Date();
      await this.prisma.client.invoice.updateMany({
        where: {
          invoiceDate: {
            lt: currentDate,
          },
          invoiceStatus: {
            notIn: ['DUE', 'PAID'],
          },
        },
        data: {
          invoiceStatus: 'DUE',
          updatedAt: currentDate,
        },
      });

      // Set pagination defaults
      const currentPage = page && page > 0 ? page : 1;
      const itemsPerPage = limit && limit > 0 && limit <= 100 ? limit : 10;
      const skip = (currentPage - 1) * itemsPerPage;

      // Build where clause
      const where: any = {};

      // Add search filter - search by invoice ID
      if (search && search.trim()) {
        where.id = {
          contains: search.trim(),
          mode: 'insensitive',
        };
      }

      // Add invoiceType filter if provided
      if (invoiceType && invoiceType.trim()) {
        where.invoiceType = invoiceType;
      }
      if (clientId && clientId.trim()) {
        where.clientId = clientId.trim();
      }

      // Add invoiceStatus filter if provided
      if (invoiceStatus && invoiceStatus.trim()) {
        where.invoiceStatus = invoiceStatus;
      }

      // Get total count for pagination
      const totalItems = await this.prisma.client.invoice.count({ where });

      // Get invoices with pagination
      const invoices = await this.prisma.client.invoice.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: itemsPerPage,
      });

      // Calculate pagination info
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const hasNextPage = currentPage < totalPages;
      const hasPreviousPage = currentPage > 1;

      return {
        success: true,
        data: invoices,
        pagination: {
          currentPage,
          limit: itemsPerPage,
          totalItems,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching invoices:', error);
      throw new BadRequestException(
        `Failed to fetch invoices: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getInvoiceById(invoiceId: string) {
    try {
      // Validate invoice ID
      if (!invoiceId || !invoiceId.trim()) {
        throw new BadRequestException('Invoice ID is required');
      }

      // Get invoice by ID
      const invoice = await this.prisma.client.invoice.findUnique({
        where: {
          id: invoiceId.trim(),
        },
        select: {
          id: true,
          invoiceType: true,
          orgName: true,
          supplierName: true,
          description: true,
          amount: true,
          discount: true,
          vat: true,
          transaction: {
            select: {
              id: true,
              document: {
                select: {
                  files: {
                    select: {
                      url: true,
                    },
                  },
                },
              },
              transactionType: true,
            },
          },
          invoiceDate: true,
          invoiceStatus: true,
        },
      });

      // Check if invoice exists
      if (!invoice) {
        throw new BadRequestException(`Invoice with ID ${invoiceId} not found`);
      }

      return {
        success: true,
        invoice,
      };
    } catch (error) {
      this.logger.error('Error fetching invoice by ID:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateInvoiceStatus(invoiceId: string, invoiceStatus: InvoiceStatus) {
    try {
      // Validate invoice ID
      if (!invoiceId || !invoiceId.trim()) {
        throw new BadRequestException('Invoice ID is required');
      }

      // Validate invoice status
      if (
        !invoiceStatus ||
        ![
          InvoiceStatus.PENDING,
          InvoiceStatus.PAID,
          InvoiceStatus.DUE,
        ].includes(invoiceStatus)
      ) {
        throw new BadRequestException(
          'Invoice status must be PENDING, PAID, or DUE',
        );
      }

      // Check if invoice exists
      const existingInvoice = await this.prisma.client.invoice.findUnique({
        where: {
          id: invoiceId.trim(),
        },
      });

      if (!existingInvoice) {
        throw new BadRequestException(`Invoice with ID ${invoiceId} not found`);
      }

      // Store old status for message
      const oldStatus = existingInvoice.invoiceStatus;

      // Update invoice status
      const updatedInvoice = await this.prisma.client.invoice.update({
        where: {
          id: invoiceId.trim(),
        },
        data: {
          invoiceStatus: invoiceStatus,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        updatedInvoice,
        message: `Invoice status updated successfully from ${oldStatus} to ${invoiceStatus}`,
      };
    } catch (error) {
      this.logger.error('Error updating invoice status:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update invoice status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async uploadInvoiceFile(
    invoiceId: string,
    user: JWTPayload,
    file: Express.Multer.File,
  ) {
    try {
      // Validate invoice ID
      if (!invoiceId || !invoiceId.trim()) {
        throw new BadRequestException('Invoice ID is required');
      }

      // Validate user
      if (!user?.sub) {
        throw new BadRequestException('User information is required');
      }

      // Validate file
      if (!file) {
        throw new BadRequestException('File is required');
      }

      // Check if invoice exists
      const existingInvoice = await this.prisma.client.invoice.findUnique({
        where: {
          id: invoiceId.trim(),
        },
        include: {
          file: true,
        },
      });

      if (!existingInvoice) {
        throw new BadRequestException(`Invoice with ID ${invoiceId} not found`);
      }

      // Check if invoice already has a file
      if (existingInvoice.fileId) {
        throw new BadRequestException(
          'Invoice already has a file attached. Please delete the existing file first.',
        );
      }

      // Upload file to Cloudinary
      this.logger.log(`Uploading file to Cloudinary for invoice ${invoiceId}`);
      const uploadResults = await this.cloudinaryService.uploadFiles(
        [file],
        'invoices',
      );

      const uploadResult = uploadResults[0];

      // Create file record and link to invoice
      const fileRecord = await this.prisma.client.file.create({
        data: {
          invoiceId: invoiceId.trim(),
          url: uploadResult.secure_url,
          mimeType: file.mimetype,
          sizeKB: Math.ceil(file.size / 1024),
          extension: uploadResult.format,
          checksum: uploadResult.public_id,
        },
      });

      // Update invoice with fileId
      await this.prisma.client.invoice.update({
        where: {
          id: invoiceId.trim(),
        },
        data: {
          fileId: fileRecord.id,
        },
      });

      this.logger.log(
        `File uploaded successfully to invoice ${invoiceId}: ${fileRecord.id}`,
      );

      return {
        success: true,
        data: {
          invoiceId: invoiceId.trim(),
          fileId: fileRecord.id,
          url: fileRecord.url,
          mimeType: fileRecord.mimeType,
          sizeKB: fileRecord.sizeKB,
          extension: fileRecord.extension,
        },
        message: 'File uploaded successfully to invoice',
      };
    } catch (error) {
      this.logger.error('Error uploading file to invoice:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to upload file to invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
  ) {
    try {
      // Validate inputs
      if (!userId || !userId.trim()) {
        throw new BadRequestException('User ID is required');
      }

      if (!title || !title.trim()) {
        throw new BadRequestException('Notification title is required');
      }

      if (!message || !message.trim()) {
        throw new BadRequestException('Notification message is required');
      }

      if (!type || !type.trim()) {
        throw new BadRequestException('Notification type is required');
      }

      // Check if user exists
      const user = await this.prisma.client.user.findUnique({
        where: {
          id: userId.trim(),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      });

      if (!user) {
        throw new BadRequestException(`User with ID ${userId} not found`);
      }

      // Create notification
      // const notification = await this.prisma.client.notification.create({
      //   data: {
      //     type,
      //     title,
      //     message,
      //     meta: {
      //       sentAt: new Date().toISOString(),
      //       recipientCount: 1,
      //     },
      //     users: {
      //       create: {
      //         userId: user.id,
      //       },
      //     },
      //   },
      //   include: {
      //     users: {
      //       include: {
      //         user: {
      //           select: {
      //             id: true,
      //             email: true,
      //             fullName: true,
      //           },
      //         },
      //       },
      //     },
      //   },
      // });

      // this.logger.log(
      //   `Notification "${title}" sent successfully to user ${user.id}`,
      // );

      return {
        success: true,
        data: {
          recipientCount: 1,
          recipient: {
            userId: user.id,
            email: user.email,
            fullName: user.fullName,
          },
        },
        message: `Notification sent successfully to user ${user.fullName}`,
      };
    } catch (error) {
      this.logger.error('Error sending notification:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async createVatReturn(input: CreateVatReturnInput) {
    const { dto, user } = input;

    // Validate input
    if (!user?.sub) {
      throw new BadRequestException('User information is required');
    }

    if (!dto?.periodType || !dto?.years || !dto?.period) {
      throw new BadRequestException(
        'Missing required fields: periodType, years, period',
      );
    }

    // Validate periodType enum
    if (!['MONTHLY', 'QUARTERLY'].includes(dto.periodType)) {
      throw new BadRequestException(
        'Invalid periodType. Must be MONTHLY or QUARTERLY',
      );
    }

    // Validate years is positive
    if (dto.years <= 2000) {
      throw new BadRequestException('Years must after 2000');
    }

    try {
      // Define date range based on period type
      let startDate: Date;
      let endDate: Date;

      if (dto.periodType === 'MONTHLY') {
        // Monthly period - map month name to month number
        const monthMap: { [key: string]: number } = {
          JANUARY: 0,
          FEBRUARY: 1,
          MARCH: 2,
          APRIL: 3,
          MAY: 4,
          JUNE: 5,
          JULY: 6,
          AUGUST: 7,
          SEPTEMBER: 8,
          OCTOBER: 9,
          NOVEMBER: 10,
          DECEMBER: 11,
        };

        const monthIndex = monthMap[dto.period];
        if (monthIndex === undefined) {
          throw new BadRequestException(
            `Invalid period for MONTHLY: ${dto.period}. Must be a month name (JANUARY-DECEMBER)`,
          );
        }

        startDate = new Date(dto.years, monthIndex, 1);
        endDate = new Date(dto.years, monthIndex + 1, 0, 23, 59, 59, 999);
      } else {
        // Quarterly period
        const quarterMap: { [key: string]: { start: number; end: number } } = {
          Q1: { start: 0, end: 2 }, // Jan-Mar
          Q2: { start: 3, end: 5 }, // Apr-Jun
          Q3: { start: 6, end: 8 }, // Jul-Sep
          Q4: { start: 9, end: 11 }, // Oct-Dec
        };

        const quarter = quarterMap[dto.period];
        if (!quarter) {
          throw new BadRequestException(
            `Invalid period for QUARTERLY: ${dto.period}. Must be Q1, Q2, Q3, or Q4`,
          );
        }

        startDate = new Date(dto.years, quarter.start, 1);
        endDate = new Date(dto.years, quarter.end + 1, 0, 23, 59, 59, 999);
      }

      // Fetch all PAID invoices within the date range
      const paidInvoices = await this.prisma.client.invoice.findMany({
        where: {
          invoiceStatus: 'PAID',
          invoiceDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          id: true,
          invoiceType: true,
          vatAmount: true,
          amount: true,
          vat: true,
        },
      });

      // Calculate inVat (from SELLS invoices) and outVat (from EXPENSE invoices)
      let inVat = 0; // VAT from sales
      let outVat = 0; // VAT from expenses

      for (const invoice of paidInvoices) {
        const vatAmount = invoice.vatAmount ? Number(invoice.vatAmount) : 0;

        if (invoice.invoiceType === 'SELLS') {
          inVat += vatAmount;
        } else if (invoice.invoiceType === 'EXPENSE') {
          outVat += vatAmount;
        }
      }

      // Calculate netVat (inVat + outVat, representing VAT to pay to authorities)
      const netVat = inVat + outVat;

      // Create VAT return record
      const vatReturn = await this.prisma.client.vatReport.create({
        data: {
          periodType: dto.periodType,
          years: dto.years,
          period: dto.period,
          vatStatus: 'PENDING',
          inVat,
          outVat,
          netVat,
        },
      });

      this.logger.log(
        `VAT Return created successfully: ${vatReturn.id} for period ${dto.period} ${dto.years}. InVat: ${inVat}, OutVat: ${outVat}, NetVat: ${netVat}`,
      );

      return {
        success: true,
        data: vatReturn,
        message: `VAT Return created successfully with ${paidInvoices.length} paid invoice(s)`,
      };
    } catch (error) {
      this.logger.error('Error creating VAT Return:', error);
      throw new BadRequestException(
        `Failed to create VAT Return: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getVatReturns(
    page?: number,
    limit?: number,
    vatStatus?: string,
    search?: string,
  ) {
    try {
      // Calculate pagination
      const pageNum = page && page > 0 ? Number(page) : 1;
      const limitNum = limit && limit > 0 ? Number(limit) : 10;
      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const where: any = {};

      // Add vatStatus filter if provided
      if (vatStatus && vatStatus.trim()) {
        const validStatuses = ['PENDING', 'SUBMITTED', 'PAID'];
        const upperStatus = vatStatus.trim().toUpperCase();
        if (validStatuses.includes(upperStatus)) {
          where.vatStatus = upperStatus;
        }
      }

      // Add search filter for period or year if provided
      if (search && search.trim()) {
        const searchValue = search.trim().toUpperCase();
        const validPeriods = [
          'JANUARY',
          'FEBRUARY',
          'MARCH',
          'APRIL',
          'MAY',
          'JUNE',
          'JULY',
          'AUGUST',
          'SEPTEMBER',
          'OCTOBER',
          'NOVEMBER',
          'DECEMBER',
          'Q1',
          'Q2',
          'Q3',
          'Q4',
        ];
        const yearNum = Number(search.trim());

        const orConditions: any[] = [];

        // Check if search matches a valid period
        if (validPeriods.includes(searchValue)) {
          orConditions.push({ period: searchValue });
        }

        // Check if search is a valid year
        if (!isNaN(yearNum) && yearNum > 0) {
          orConditions.push({ years: yearNum });
        }

        // If we have any OR conditions, add them to the where clause
        if (orConditions.length > 0) {
          where.OR = orConditions;
        }
      }

      // Get total count for pagination metadata
      const total = await this.prisma.client.vatReport.count({ where });

      // Get paginated VAT returns ordered by creation date
      const vatReturns = await this.prisma.client.vatReport.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limitNum,
      });

      return {
        success: true,
        data: vatReturns,
        metadata: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching VAT returns:', error);
      throw new BadRequestException(
        `Failed to fetch VAT returns: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateVatReport(
    userid: string,
    vatReportId: string,
    jurisdictions: string,
    files?: Express.Multer.File[],
  ) {
    try {
      // Validate vatReportId
      if (!vatReportId || !vatReportId.trim()) {
        throw new BadRequestException('VAT Report ID is required');
      }

      // Validate jurisdictions
      if (!jurisdictions || !jurisdictions.trim()) {
        throw new BadRequestException('Jurisdictions are required');
      }

      // Check if VAT Report exists
      const vatReport = await this.prisma.client.vatReport.findUnique({
        where: { id: vatReportId },
      });

      if (!vatReport) {
        throw new BadRequestException(
          `VAT Report with ID "${vatReportId}" not found`,
        );
      }

      let documentId = vatReport.documentId;

      // Handle file upload if files are provided
      if (files && files.length > 0) {
        try {
          // Upload files to Cloudinary
          const uploadedFileData = await this.cloudinaryService.uploadFiles(
            files,
            'vat-reports',
          );

          // Create document record
          const document = await this.prisma.client.document.create({
            data: {
              name: `VAT_Report_${vatReport.period}_${vatReport.years}`,
              status: 'APPROVED',
              documentCateory: 'OTHERS',
              uploadedBy: userid,
              folderId: null,
              files: {
                create: uploadedFileData.map((file: any) => ({
                  url: file.secure_url,
                  mimeType:
                    file.resource_type === 'video' ? 'video/*' : file.format,
                  sizeKB: Math.round(file.bytes / 1024),
                  extension: file.format || file.resource_type,
                })),
              },
            },
            include: {
              files: true,
            },
          });

          documentId = document.id;

          this.logger.log(
            `Files uploaded successfully for VAT Report ${vatReportId}: ${uploadedFileData.length} file(s)`,
          );
        } catch (fileError) {
          this.logger.error(
            `Failed to upload files for VAT Report ${vatReportId}:`,
            fileError,
          );
          throw new BadRequestException(
            `Failed to upload files: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`,
          );
        }
      }

      // Update VAT Report
      const updatedVatReport = await this.prisma.client.vatReport.update({
        where: { id: vatReportId },
        data: {
          jurisdictions: jurisdictions.trim(),
          documentId,
        },
        include: {
          document: {
            include: {
              files: true,
            },
          },
        },
      });

      this.logger.log(
        `VAT Report ${vatReportId} updated successfully with jurisdictions and document`,
      );

      // Format response
      const fileUrls = updatedVatReport.document?.files || [];

      return {
        success: true,
        data: {
          id: updatedVatReport.id,
          periodType: updatedVatReport.periodType,
          years: updatedVatReport.years,
          period: updatedVatReport.period,
          vatStatus: updatedVatReport.vatStatus,
          jurisdictions: updatedVatReport.jurisdictions,
          documentId: updatedVatReport.documentId,
          fileUrls: fileUrls.map((file: any) => ({
            fileId: file.id,
            url: file.url,
            mimeType: file.mimeType,
            sizeKB: file.sizeKB,
            extension: file.extension,
          })),
          createdAt: updatedVatReport.createdAt,
          updatedAt: updatedVatReport.updatedAt,
        },
        message: `VAT Report updated successfully with ${fileUrls.length} file(s)`,
      };
    } catch (error) {
      this.logger.error('Error updating VAT Report:', error);
      throw new BadRequestException(
        `Failed to update VAT Report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async createPayment(input: CreatePaymentInput) {
    const { dto, user, files } = input;

    // Validate input
    if (!user?.sub) {
      throw new BadRequestException('User information is required');
    }

    if (
      !dto?.invoiceId ||
      !dto?.amount ||
      !dto?.paymentMethod ||
      !dto?.paymentDate
    ) {
      throw new BadRequestException(
        'Missing required fields: invoiceId, amount, paymentMethod, paymentDate',
      );
    }

    // Validate files are provided
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    try {
      // Check if invoice exists
      const invoice = await this.prisma.client.invoice.findUnique({
        where: { id: dto.invoiceId },
      });

      if (!invoice) {
        throw new BadRequestException('Invoice not found');
      }

      // Check if payment already exists for this invoice
      const existingPayment = await this.prisma.client.payment.findUnique({
        where: { invoiceId: dto.invoiceId },
      });

      if (existingPayment) {
        throw new BadRequestException(
          `Payment already exists for invoice ID ${dto.invoiceId}`,
        );
      }

      // Get or create the 'payments' folder
      let paymentsFolder = await this.prisma.client.folder.findFirst({
        where: {
          name: 'payments',
          createdBy: user.sub,
        },
      });

      if (!paymentsFolder) {
        paymentsFolder = await this.prisma.client.folder.create({
          data: {
            name: 'payments',
            createdBy: user.sub,
          },
        });
      }

      // Upload files to Cloudinary and prepare file data
      const uploadedFileData: Array<{
        url: string;
        mimeType: string;
        sizeKB: number;
        extension: string;
        checksum?: string;
      }> = [];

      if (files && files.length > 0) {
        this.logger.log(`Uploading ${files.length} files to Cloudinary...`);

        const uploadResults = await this.cloudinaryService.uploadFiles(
          files,
          'payments',
        );

        for (let i = 0; i < uploadResults.length; i++) {
          const result = uploadResults[i];
          const file = files[i];

          uploadedFileData.push({
            url: result.secure_url,
            mimeType: file.mimetype,
            sizeKB: Math.ceil(file.size / 1024),
            extension: result.format,
            checksum: result.public_id,
          });
        }
      }

      // Determine vendor: use DTO value if provided, otherwise derive from invoice
      let vendor: string;
      if (dto.vendor && dto.vendor.trim()) {
        vendor = dto.vendor.trim();
      } else if (invoice.invoiceType === 'SELLS') {
        vendor = invoice.orgName || 'Unknown';
      } else if (invoice.invoiceType === 'EXPENSE') {
        vendor = invoice.supplierName || 'Unknown';
      } else {
        vendor = 'Unknown';
      }

      // Create payment record using values from DTO (paymentStatus defaults to PENDING if not provided)
      const payment = await this.prisma.client.payment.create({
        data: {
          invoiceId: dto.invoiceId,
          vendor,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod as 'BANK' | 'CASH' | 'CARD',
          paymentStatus: (dto.paymentStatus || 'PENDING') as
            | 'PENDING'
            | 'COMPLETED',
          paymentDate: new Date(dto.paymentDate),
        },
      });

      // Create document with payment and files
      const document = await this.prisma.client.document.create({
        data: {
          folderId: paymentsFolder.id,
          uploadedBy: user.sub,
          name: `Payment_${Date.now()}`,
          status: 'PENDING',
          documentCateory: 'PAYMENT_PROCESS',
          // Link payment to document (if there's a relationship field)
          files: {
            create: uploadedFileData,
          },
        },
        include: {
          files: true,
        },
      });

      await this.prisma.client.bankReconciliation.update({
        where: { invoiceId: invoice.id },
        data: {
          ledgerAmount: parseFloat(dto.amount.toString()),
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
        },
      });

      const banckReconciliation =
        await this.prisma.client.bankReconciliation.findUnique({
          where: { invoiceId: invoice.id },
        });

      if (
        banckReconciliation &&
        banckReconciliation.ledgerAmount &&
        banckReconciliation.backAmount
      ) {
        if (
          banckReconciliation.ledgerAmount === banckReconciliation.backAmount
        ) {
          await this.prisma.client.bankReconciliation.update({
            where: { invoiceId: invoice.id },
            data: {
              reconciliationStatus: 'MATCH',
            },
          });
        } else {
          await this.prisma.client.bankReconciliation.update({
            where: { invoiceId: invoice.id },
            data: {
              reconciliationStatus: 'ADJUSTMENT',
            },
          });
        }
      }

      return {
        success: true,
        data: {
          ...payment,
          documentId: document.id,
          fileUrls: document.files.map((file: any) => ({
            fileId: file.id,
            url: file.url,
            mimeType: file.mimeType,
            sizeKB: file.sizeKB,
            extension: file.extension,
          })),
        },
        message: `Payment created successfully with ${uploadedFileData.length} file(s)`,
      };
    } catch (error) {
      this.logger.error('Error creating payment:', error);

      if (input.files && input.files.length > 0) {
        this.logger.warn(
          'Attempting to cleanup uploaded files due to error...',
        );
      }

      throw new BadRequestException(
        `Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getPayments(
    search?: string,
    paymentMethod?: string,
    paymentStatus?: string,
    page?: number,
    limit?: number,
  ) {
    try {
      // Build where clause
      const where: any = {};

      // Add search filter (search across vendor and invoiceId)
      if (search && search.trim()) {
        where.OR = [
          {
            vendor: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
          {
            invoiceId: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
        ];
      }

      // Add paymentMethod filter
      if (paymentMethod && paymentMethod.trim()) {
        const validMethods = ['BANK', 'CASH', 'CARD'];
        const upperMethod = paymentMethod.trim().toUpperCase();
        if (validMethods.includes(upperMethod)) {
          where.paymentMethod = upperMethod;
        }
      }

      // Add paymentStatus filter
      if (paymentStatus && paymentStatus.trim()) {
        const validStatuses = ['PENDING', 'COMPLETED'];
        const upperStatus = paymentStatus.trim().toUpperCase();
        if (validStatuses.includes(upperStatus)) {
          where.paymentStatus = upperStatus;
        }
      }

      // Calculate pagination
      const pageNum = page && page > 0 ? Number(page) : 1;
      const limitNum = limit && limit > 0 ? Number(limit) : 10;
      const skip = (pageNum - 1) * limitNum;

      // Get total count for pagination metadata
      const total = await this.prisma.client.payment.count({ where });

      // Get paginated payment records
      const payments = await this.prisma.client.payment.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          invoiceId: true,
          vendor: true,
          amount: true,
          paymentMethod: true,
          paymentStatus: true,
          paymentDate: true,
          documents: {
            select: {
              files: {
                select: {
                  url: true,
                },
              },
            },
          },
        },
        skip,
        take: limitNum,
      });

      return {
        success: true,
        data: payments,
        metadata: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching payments:', error);
      throw new BadRequestException(
        `Failed to fetch payments: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updatePaymentStatus(paymentId: string, paymentStatus: string) {
    try {
      // Validate paymentId is provided
      if (!paymentId || !paymentId.trim()) {
        throw new BadRequestException('Payment ID is required');
      }

      // Validate paymentStatus enum values
      const validStatuses = ['PENDING', 'COMPLETED'];
      const upperStatus = paymentStatus.toUpperCase();

      if (!validStatuses.includes(upperStatus)) {
        throw new BadRequestException(
          `Invalid PaymentStatus. Must be one of: ${validStatuses.join(', ')}`,
        );
      }

      // Check if payment exists
      const existingPayment = await this.prisma.client.payment.findUnique({
        where: { id: paymentId.trim() },
      });

      if (!existingPayment) {
        throw new BadRequestException(
          `Payment with ID "${paymentId}" not found`,
        );
      }

      // Update payment status
      const updatedPayment = await this.prisma.client.payment.update({
        where: { id: paymentId.trim() },
        data: {
          paymentStatus: upperStatus as any,
        },
      });

      this.logger.log(
        `Payment status updated successfully for ID: ${paymentId}`,
      );

      return {
        success: true,
        data: updatedPayment,
        message: `Payment status updated from ${existingPayment.paymentStatus} to ${upperStatus}`,
      };
    } catch (error) {
      this.logger.error('Error updating payment status:', error);
      throw new BadRequestException(
        `Failed to update payment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async createAccrualDeferral(input: CreateAccrualDeferralInput) {
    try {
      const { dto } = input;

      const accrualDeferral = await this.prisma.client.accrualDeferral.create({
        data: {
          name: dto.name,
          period: dto.period,
          type: dto.type,
          description: dto.description,
          amount: dto.amount,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: dto.status || 'DRAFT',
        },
      });

      return {
        success: true,
        data: accrualDeferral,
        message: 'Accrual/Deferral created successfully',
      };
    } catch (error) {
      this.logger.error('Error creating accrual/deferral:', error);
      throw new BadRequestException(
        `Failed to create accrual/deferral: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getAccrualDeferrals(
    search?: string,
    status?: string,
    page?: number,
    limit?: number,
  ) {
    try {
      // Pagination defaults
      const currentPage = page && page > 0 ? page : 1;
      const pageSize = limit && limit > 0 ? limit : 10;
      const skip = (currentPage - 1) * pageSize;

      // Build where clause
      const where: any = {
        isDeleted: false,
      };

      // Add search filter if provided - search by name or description
      if (search && search.trim()) {
        where.OR = [
          {
            name: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
        ];
      }

      // Add status filter if provided
      if (status && status.trim()) {
        where.status = status.trim();
      }

      // Get total count
      const total = await this.prisma.client.accrualDeferral.count({ where });

      // Get filtered accrual/deferral records ordered by creation date with pagination
      const accrualDeferrals =
        await this.prisma.client.accrualDeferral.findMany({
          where: Object.keys(where).length === 0 ? {} : where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: pageSize,
        });

      const totalPages = Math.ceil(total / pageSize);

      return {
        success: true,
        data: accrualDeferrals,
        metadata: {
          total,
          page: currentPage,
          limit: pageSize,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching accrual/deferral records:', error);
      throw new BadRequestException(
        `Failed to fetch accrual/deferral records: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getAccrualDeferralSummary() {
    try {
      // Get total accruals
      const totalAccrualsResult =
        await this.prisma.client.accrualDeferral.aggregate({
          where: {
            type: 'ACCRUAL',
            isDeleted: false,
          },
          _sum: {
            amount: true,
          },
        });

      const totalAccruals = totalAccrualsResult._sum.amount || 0;

      // Get total deferrals
      const totalDeferralsResult =
        await this.prisma.client.accrualDeferral.aggregate({
          where: {
            type: 'DEFERRAL',
            isDeleted: false,
          },
          _sum: {
            amount: true,
          },
        });

      const totalDeferrals = totalDeferralsResult._sum.amount || 0;

      return {
        success: true,
        data: {
          totalAccruals,
          totalDeferrals,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching accrual/deferral summary:', error);
      throw new BadRequestException(
        `Failed to fetch accrual/deferral summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateAccrualDeferral(
    accrualDeferralId: string,
    dto: {
      name?: string;
      period?: string;
      type?: string;
      description?: string;
      amount?: number;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
  ) {
    try {
      // Validate ID
      if (!accrualDeferralId || !accrualDeferralId.trim()) {
        throw new BadRequestException('Accrual/Deferral ID is required');
      }

      // Check if at least one field is provided
      if (
        !dto.name &&
        !dto.period &&
        !dto.type &&
        !dto.description &&
        dto.amount === undefined &&
        !dto.startDate &&
        !dto.endDate &&
        !dto.status
      ) {
        throw new BadRequestException(
          'At least one field must be provided for update',
        );
      }

      // Validate type if provided
      if (dto.type) {
        const validTypes = ['ACCRUAL', 'DEFERRAL'];
        const upperType = dto.type.toUpperCase();

        if (!validTypes.includes(upperType)) {
          throw new BadRequestException(
            `Invalid type. Must be one of: ${validTypes.join(', ')}`,
          );
        }
      }

      // Validate status if provided
      if (dto.status) {
        const validStatuses = ['DRAFT', 'POSTED'];
        const upperStatus = dto.status.toUpperCase();

        if (!validStatuses.includes(upperStatus)) {
          throw new BadRequestException(
            `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          );
        }
      }

      // Validate amount if provided
      if (dto.amount !== undefined && dto.amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }

      // Check if accrual/deferral exists
      const existingEntry = await this.prisma.client.accrualDeferral.findUnique(
        {
          where: {
            id: accrualDeferralId.trim(),
          },
        },
      );

      if (!existingEntry) {
        throw new BadRequestException(
          `Accrual/Deferral with ID ${accrualDeferralId} not found`,
        );
      }

      // Build update data
      const updateData: any = {};

      if (dto.name !== undefined) {
        updateData.name = dto.name;
      }

      if (dto.period !== undefined) {
        updateData.period = dto.period;
      }

      if (dto.type) {
        updateData.type = dto.type.toUpperCase();
      }

      if (dto.description !== undefined) {
        updateData.description = dto.description;
      }

      if (dto.amount !== undefined) {
        updateData.amount = dto.amount;
      }

      if (dto.startDate) {
        updateData.startDate = new Date(dto.startDate);
      }

      if (dto.endDate) {
        updateData.endDate = new Date(dto.endDate);
      }

      if (dto.status) {
        updateData.status = dto.status.toUpperCase();
      }

      // Update accrual/deferral
      const updatedEntry = await this.prisma.client.accrualDeferral.update({
        where: {
          id: accrualDeferralId.trim(),
        },
        data: updateData,
      });

      return {
        success: true,
        data: updatedEntry,
        message: 'Accrual/Deferral updated successfully',
      };
    } catch (error) {
      this.logger.error('Error updating accrual/deferral:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update accrual/deferral: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getAccrualDeferralById(accrualDeferralId: string) {
    try {
      // Validate ID
      if (!accrualDeferralId || !accrualDeferralId.trim()) {
        throw new BadRequestException('Accrual/Deferral ID is required');
      }

      // Find the accrual/deferral entry
      const accrualDeferral =
        await this.prisma.client.accrualDeferral.findUnique({
          where: {
            id: accrualDeferralId.trim(),
          },
        });

      if (!accrualDeferral) {
        throw new BadRequestException(
          `Accrual/Deferral with ID ${accrualDeferralId} not found`,
        );
      }

      // Check if soft deleted
      if (accrualDeferral.isDeleted) {
        throw new BadRequestException(
          `Accrual/Deferral with ID ${accrualDeferralId} has been deleted`,
        );
      }

      return {
        success: true,
        data: accrualDeferral,
        message: 'Accrual/Deferral retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error fetching accrual/deferral by ID:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch accrual/deferral: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async searchBankReconciliations(
    invoiceId?: string,
    reconciliationStatus?: string,
    page?: number,
    limit?: number,
  ) {
    try {
      // Build where clause
      const where: any = {};

      // Add invoiceId filter if provided
      if (invoiceId && invoiceId.trim()) {
        where.invoiceId = {
          contains: invoiceId.trim(),
          mode: 'insensitive',
        };
      }

      // Add reconciliationStatus filter if provided
      if (reconciliationStatus && reconciliationStatus.trim()) {
        const validStatuses = ['PENDING', 'ADJUSTMENT', 'MATCH', 'FAILED'];
        const upperStatus = reconciliationStatus.trim().toUpperCase();

        if (validStatuses.includes(upperStatus)) {
          where.reconciliationStatus = upperStatus;
        }
      }

      // Calculate pagination
      const pageNum = page && page > 0 ? Number(page) : 1;
      const limitNum = limit && limit > 0 ? Number(limit) : 10;
      const skip = (pageNum - 1) * limitNum;

      // Get total count for pagination metadata
      const total = await this.prisma.client.bankReconciliation.count({
        where,
      });

      // Get filtered bank reconciliation records ordered by creation date
      const reconciliations =
        await this.prisma.client.bankReconciliation.findMany({
          where,
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limitNum,
        });

      return {
        success: true,
        data: reconciliations,
        metadata: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    } catch (error) {
      this.logger.error('Error searching bank reconciliations:', error);
      throw new BadRequestException(
        `Failed to search bank reconciliations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updateReconciliationStatus(
    reconciliationId: string,
    reconciliationStatus: string,
  ) {
    try {
      // Validate reconciliation ID
      if (!reconciliationId || !reconciliationId.trim()) {
        throw new BadRequestException('Reconciliation ID is required');
      }

      // Validate reconciliation status
      const validStatuses = ['PENDING', 'ADJUSTMENT', 'MATCH', 'FAILED'];
      const upperStatus = reconciliationStatus.toUpperCase();

      if (!validStatuses.includes(upperStatus)) {
        throw new BadRequestException(
          `Invalid ReconciliationStatus. Must be one of: ${validStatuses.join(', ')}`,
        );
      }

      // Check if reconciliation exists
      const existingReconciliation =
        await this.prisma.client.bankReconciliation.findUnique({
          where: {
            id: reconciliationId.trim(),
          },
        });

      if (!existingReconciliation) {
        throw new BadRequestException(
          `Bank reconciliation with ID ${reconciliationId} not found`,
        );
      }

      // Store old status for message
      const oldStatus = existingReconciliation.reconciliationStatus;

      // Update reconciliation status
      const updatedReconciliation =
        await this.prisma.client.bankReconciliation.update({
          where: {
            id: reconciliationId.trim(),
          },
          data: {
            reconciliationStatus: upperStatus as any,
            updatedAt: new Date(),
          },
        });

      this.logger.log(
        `Bank reconciliation status updated successfully for ID: ${reconciliationId}`,
      );

      return {
        success: true,
        data: updatedReconciliation,
        message: `Reconciliation status updated successfully from ${oldStatus} to ${upperStatus}`,
      };
    } catch (error) {
      this.logger.error('Error updating reconciliation status:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update reconciliation status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ========================= GET VAT RETURN BY ID =========================

  async getVatReturnById(vatReportId: string) {
    try {
      // Validate vatReportId
      if (!vatReportId || !vatReportId.trim()) {
        throw new BadRequestException('VAT Report ID is required');
      }

      // Find the VAT Report
      const vatReport = await this.prisma.client.vatReport.findUnique({
        where: { id: vatReportId },
        include: {
          document: {
            include: {
              files: true,
            },
          },
        },
      });

      if (!vatReport) {
        throw new BadRequestException(
          `VAT Report with ID "${vatReportId}" not found`,
        );
      }

      this.logger.log(`VAT Report ${vatReportId} retrieved successfully`);

      // Format response
      const fileUrls = vatReport.document?.files || [];

      return {
        success: true,
        data: {
          id: vatReport.id,
          periodType: vatReport.periodType,
          years: vatReport.years,
          period: vatReport.period,
          vatStatus: vatReport.vatStatus,
          outVat: vatReport.outVat,
          inVat: vatReport.inVat,
          netVat: vatReport.netVat,
          jurisdictions: vatReport.jurisdictions,
          documentId: vatReport.documentId,
          fileUrls: fileUrls.map((file: any) => ({
            fileId: file.id,
            url: file.url,
            mimeType: file.mimeType,
            sizeKB: file.sizeKB,
            extension: file.extension,
          })),
          createdAt: vatReport.createdAt,
          updatedAt: vatReport.updatedAt,
        },
        message: 'VAT Report retrieved successfully',
      };
    } catch (error) {
      this.logger.error('Error retrieving VAT Report:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve VAT Report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ========================= UPDATE VAT STATUS =========================

  async updateVatStatus(vatReportId: string, vatStatus: string) {
    try {
      // Validate vatReportId
      if (!vatReportId || !vatReportId.trim()) {
        throw new BadRequestException('VAT Report ID is required');
      }

      // Validate vatStatus
      if (!vatStatus || !vatStatus.trim()) {
        throw new BadRequestException('VAT Status is required');
      }

      const upperStatus = vatStatus.trim().toUpperCase();
      if (!['PENDING', 'SUBMITTED', 'PAID'].includes(upperStatus)) {
        throw new BadRequestException(
          `Invalid VAT Status: ${vatStatus}. Must be PENDING, SUBMITTED, or PAID`,
        );
      }

      // Check if VAT Report exists
      const vatReport = await this.prisma.client.vatReport.findUnique({
        where: { id: vatReportId },
      });

      if (!vatReport) {
        throw new BadRequestException(
          `VAT Report with ID "${vatReportId}" not found`,
        );
      }

      // Update VAT Report status
      const updatedVatReport = await this.prisma.client.vatReport.update({
        where: { id: vatReportId },
        data: {
          vatStatus: upperStatus as any,
        },
        include: {
          document: {
            include: {
              files: true,
            },
          },
        },
      });

      this.logger.log(
        `VAT Report ${vatReportId} status updated to ${upperStatus}`,
      );

      return {
        success: true,
        data: {
          id: updatedVatReport.id,
          periodType: updatedVatReport.periodType,
          years: updatedVatReport.years,
          period: updatedVatReport.period,
          vatStatus: updatedVatReport.vatStatus,
          outVat: updatedVatReport.outVat,
          inVat: updatedVatReport.inVat,
          netVat: updatedVatReport.netVat,
          jurisdictions: updatedVatReport.jurisdictions,
          documentId: updatedVatReport.documentId,
          createdAt: updatedVatReport.createdAt,
          updatedAt: updatedVatReport.updatedAt,
        },
        message: `VAT Report status updated to ${upperStatus} successfully`,
      };
    } catch (error) {
      this.logger.error('Error updating VAT Report status:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update VAT Report status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ========================= GET CURRENT CLIENT INVOICES =========================

  async getCurrentClientInvoices(clientId: string) {
    try {
      this.logger.log(`Fetching invoices for client ID: ${clientId}`);

      // Validate clientId
      if (!clientId || !clientId.trim()) {
        throw new BadRequestException('Client ID is required');
      }

      // Get all invoices for this client
      const invoices = await this.prisma.client.invoice.findMany({
        where: {
          clientId: clientId.trim(),
        },
        select: {
          id: true,
          invoiceType: true,
          clientId: true,
          orgName: true,
          supplierName: true,
          description: true,
          amount: true,
          discount: true,
          discountDeadline: true,
          vat: true,
          vatAmount: true,
          invoiceDate: true,
          invoiceStatus: true,
          createdAt: true,
          updatedAt: true,
          file: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(
        `Found ${invoices.length} invoices for client ${clientId}`,
      );

      return {
        success: true,
        data: invoices,
        total: invoices.length,
        message: 'Client invoices fetched successfully',
      };
    } catch (error) {
      this.logger.error('Error fetching client invoices:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to fetch client invoices: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteFinance(id: string) {
    try {
      // Validate ID
      if (!id || !id.trim()) {
        throw new BadRequestException('Finance record ID is required');
      }

      // Check if finance record exists
      const existingRecord =
        await this.prisma.client.accrualDeferral.findUnique({
          where: { id: id.trim() },
        });
      if (!existingRecord) {
        throw new BadRequestException(
          `Finance record with ID "${id}" not found`,
        );
      }

      // Soft delete the finance record
      await this.prisma.client.accrualDeferral.delete({
        where: { id: id.trim() },
      });
      this.logger.log(`Finance record with ID "${id}" deleted successfully`);

      return {
        success: true,
        message: `Finance record with ID "${id}" deleted successfully`,
      };
    } catch (error) {
      this.logger.error('Error deleting finance record:', error);
      throw new BadRequestException(
        `Failed to delete finance record: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
