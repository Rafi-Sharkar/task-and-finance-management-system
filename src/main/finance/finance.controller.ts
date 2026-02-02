import { GetUser } from '@/core/jwt/jwt.decorator';
import { JwtAuthGuard } from '@/core/jwt/jwt.guard';
import { JWTPayload } from '@/core/jwt/jwt.interface';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateAccrualDeferralDto } from './dto/createAccrualDeferral.dto';
import { CreateCashDto } from './dto/createCash.dto';
import { CreateInvoiceDto } from './dto/createInvoice.dto';
import { CreateNotificationDto } from './dto/createNotification.dto';
import { CreatePaymentDto } from './dto/createPayment.dto';
import { CreateProvisionDto } from './dto/createProvision.dto';
import { CreateTransactionDto } from './dto/createTransaction.dto';
import { UpdateProvisionDto } from './dto/updateProvision.dto';
import { CreateVatReturnDto } from './dto/createVatReturn.dto';
import { UpdateAccrualDeferralDto } from './dto/updateAccrualDeferral.dto';
import { UpdateCashDto } from './dto/updateCash.dto';
import { UpdateInvoiceStatusDto } from './dto/updateInvoiceStatus.dto';
import { UpdatePaymentStatusDto } from './dto/updatePaymentStatus.dto';
import { UpdateReconciliationStatusDto } from './dto/updateReconciliationStatus.dto';
import { UpdateTransactionDto } from './dto/updateTransaction.dto';
import { UpdateVatReportDto } from './dto/updateVatReport.dto';
import { UpdateVatStatusDto } from './dto/updateVatStatus.dto';
import { FinanceService } from './finance.service';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // Transaction Endpoints
  @Post('transactions/create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 10 }]))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new transaction with file uploads: Test_OK',
    description:
      'Create a financial transaction with optional file attachments. Files are uploaded to Cloudinary.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Transaction data with optional file uploads',
    schema: {
      type: 'object',
      required: [
        'transactionDate',
        'transactionType',
        'amount',
        'paymentMethod',
        'invoiceId',
      ],
      properties: {
        transactionDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-10T00:00:00Z',
          description: 'Transaction date in ISO 8601 format',
        },
        transactionType: {
          type: 'string',
          enum: ['INCOME', 'EXPENSE'],
          example: 'INCOME',
          description: 'Type of transaction',
        },
        amount: {
          type: 'number',
          format: 'decimal',
          example: 5000.5,
          description: 'Transaction amount',
        },
        paymentMethod: {
          type: 'string',
          enum: ['BANK', 'CASH', 'CARD'],
          example: 'BANK',
          description: 'Payment method used',
        },
        description: {
          type: 'string',
          example: 'Monthly revenue',
          description: 'Optional transaction description',
        },
        invoiceId: {
          type: 'string',
          example: '12345-abc-def-789',
          description: 'Invoice ID to link transaction to invoice',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Optional file uploads - up to 10 files (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, etc.)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          folderId: 'uuid',
          uploadedBy: 'uuid',
          uploaderRole: 'EMPLOYEE',
          name: 'Transaction_timestamp',
          status: 'PENDING',
          documentCateory: 'TRANSACTION',
          transaction: {
            id: 'uuid',
            amount: '1000.00',
            transactionType: 'INCOME',
            transactionDate: '2025-01-01T00:00:00Z',
            paymentMethod: 'BANK',
          },
          files: [
            {
              id: 'uuid',
              url: 'https://cloudinary.url',
              mimeType: 'application/pdf',
              sizeKB: 500,
              extension: 'pdf',
            },
          ],
        },
        message: 'Transaction created with 1 file(s)',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid transaction data or upload error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async createTransaction(
    @Body() dto: CreateTransactionDto,
    @GetUser() user: JWTPayload,
    @UploadedFiles()
    uploadedFiles?: {
      files?: Express.Multer.File[];
    },
  ) {
    // Validate required fields
    if (
      !dto.transactionDate ||
      !dto.transactionType ||
      !dto.amount ||
      !dto.paymentMethod ||
      !dto.invoiceId
    ) {
      throw new BadRequestException(
        'Missing required fields: transactionDate, transactionType, amount, paymentMethod, invoiceId',
      );
    }

    if (!user) {
      throw new BadRequestException('User authentication required');
    }

    return this.financeService.createTransaction({
      dto,
      user,
      files: uploadedFiles?.files || [],
    });
  }

  // Search transactions
  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all transactions with search and pagination: Test_OK',
    description:
      'Retrieve all transactions with optional search by description and pagination support',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by transaction description',
    example: 'Monthly revenue',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              transactionId: { type: 'string' },
              documentId: { type: 'string' },
              uploadedBy: { type: 'string' },
              transactionType: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
              paymentMethod: { type: 'string', enum: ['BANK', 'CASH', 'CARD'] },
              amount: { type: 'string' },
              description: { type: 'string' },
              transactionDate: { type: 'string', format: 'date-time' },
              fileUrls: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    fileId: { type: 'string' },
                    url: { type: 'string' },
                    mimeType: { type: 'string' },
                    sizeKB: { type: 'number' },
                    extension: { type: 'string' },
                    uploadedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total number of transactions',
            },
            page: { type: 'number', description: 'Current page number' },
            limit: { type: 'number', description: 'Records per page' },
            totalPages: {
              type: 'number',
              description: 'Total number of pages',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async searchTransactions(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.searchTransactions(search, page, limit);
  }

  @Patch('transaction/:id/update')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a transaction amount: Test_OK',
    description:
      'Update the amount of an existing transaction by transaction ID',
  })
  @ApiBody({
    description: 'Transaction amount update',
    schema: {
      type: 'object',
      required: ['amount'],
      properties: {
        amount: {
          type: 'number',
          format: 'decimal',
          description: 'New transaction amount (must be positive)',
          example: 5500.75,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction amount updated successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          amount: 5500.5,
          description: 'Monthly revenue',
          transactionType: 'INCOME',
          paymentMethod: 'BANK',
          transactionDate: '2025-01-10T00:00:00Z',
          createdAt: '2025-01-10T12:30:00Z',
          updatedAt: '2025-01-10T12:30:00Z',
        },
        message: 'Transaction amount updated from 5000 to 5500.5',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid transaction ID or amount',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async updateTransaction(
    @Param('id') transactionId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.financeService.updateTransaction(transactionId, dto.amount);
  }

  // Cash Endpoints
  @Post('cash/create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 10 }]))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new cash record with file uploads: Test_OK',
    description:
      'Create a cash record with optional file attachments. Files are uploaded to Cloudinary.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Cash data with optional file uploads',
    schema: {
      type: 'object',
      required: ['cashDate', 'invoiceId', 'cashType'],
      properties: {
        cashDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-10T00:00:00Z',
          description: 'Cash transaction date in ISO 8601 format',
        },
        invoiceId: {
          type: 'string',
          example: '12345-abc-def-789',
          description: 'Invoice ID to link cash transaction to',
        },
        cashType: {
          type: 'string',
          enum: ['CASH_IN', 'CASH_OUT'],
          example: 'CASH_IN',
          description: 'Type of cash transaction',
        },
        cashIn: {
          type: 'number',
          format: 'decimal',
          example: 10000.5,
          description:
            'Cash In amount (optional, but at least one of cashIn or cashOut is required)',
        },
        cashOut: {
          type: 'number',
          format: 'decimal',
          example: 5000.25,
          description:
            'Cash Out amount (optional, but at least one of cashIn or cashOut is required)',
        },
        balance: {
          type: 'number',
          format: 'decimal',
          example: 15000.75,
          description: 'Total balance (optional)',
        },
        description: {
          type: 'string',
          example: 'Daily cash count',
          description: 'Optional cash record description',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Optional file uploads - up to 10 files (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, etc.)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Cash record created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          folderId: 'uuid',
          uploadedBy: 'uuid',
          uploaderRole: 'EMPLOYEE',
          name: 'Cash_timestamp',
          status: 'PENDING',
          documentCateory: 'CASH_MANAGEMENT',
          cash: {
            id: 'uuid',
            referenceNo: 'CASH001',
            cashType: 'CASH_IN',
            cashIn: '10000.50',
            cashOut: null,
            totalbalance: '10000.50',
            cashDate: '2025-01-10T00:00:00Z',
          },
          files: [
            {
              id: 'uuid',
              url: 'https://cloudinary.url',
              mimeType: 'application/pdf',
              sizeKB: 500,
              extension: 'pdf',
            },
          ],
        },
        message: 'Cash record created with 1 file(s)',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid cash data or upload error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async createCash(
    @Body() dto: CreateCashDto,
    @GetUser() user: JWTPayload,
    @UploadedFiles()
    uploadedFiles?: {
      files?: Express.Multer.File[];
    },
  ) {
    // Validate required fields
    if (!dto.cashDate) {
      throw new BadRequestException('cashDate is required');
    }
    if (!dto.invoiceId) {
      throw new BadRequestException('invoiceId is required');
    }
    if (!dto.cashType) {
      throw new BadRequestException('cashType is required');
    }

    // At least one of cashIn or cashOut must be provided
    const hasCashIn =
      dto.cashIn !== undefined && dto.cashIn !== null && dto.cashIn !== 0;
    const hasCashOut =
      dto.cashOut !== undefined && dto.cashOut !== null && dto.cashOut !== 0;

    if (!hasCashIn && !hasCashOut) {
      throw new BadRequestException(
        'At least one of cashIn or cashOut must be provided and greater than 0',
      );
    }

    if (!user) {
      throw new BadRequestException('User authentication required');
    }

    return this.financeService.createCash({
      dto,
      user,
      files: uploadedFiles?.files || [],
    });
  }

  // Search cash records
  @Get('cashs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Search cash records by invoiceId and filter by CashType with pagination: Test_OK',
    description:
      'Search cash records by document name (case-insensitive partial match), filter by cash type, and support pagination',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Filter by cash type',
    example: 'invoiceId',
  })
  @ApiQuery({
    name: 'cashType',
    required: false,
    type: String,
    enum: ['CASH_IN', 'CASH_OUT'],
    description: 'Filter by cash type',
    example: 'CASH_IN',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Cash records search results with pagination',
    schema: {
      example: {
        success: true,
        data: [
          {
            cashId: 'uuid',
            documentId: 'uuid',
            uploadedBy: 'uuid',
            uploaderRole: 'EMPLOYEE',
            referenceNo: 'CASH001',
            cashType: 'CASH_IN',
            cashIn: '10000.50',
            cashOut: null,
            totalBalance: '10000.50',
            cashDate: '2025-01-10T00:00:00Z',
            description: 'Daily cash count',
            documentName: 'Cash_1610274600000',
            fileUrls: [
              {
                fileId: 'uuid',
                url: 'https://res.cloudinary.com/...',
                mimeType: 'application/pdf',
                sizeKB: 500,
                extension: 'pdf',
                uploadedAt: '2025-01-10T12:30:00Z',
              },
            ],
            createdAt: '2025-01-10T12:30:00Z',
            updatedAt: '2025-01-10T12:30:00Z',
          },
        ],
        metadata: {
          total: 45,
          page: 1,
          limit: 10,
          totalPages: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async searchCash(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.searchCash(search, page, limit);
  }

  @Patch('cash/:id/update')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update cash record amounts: Test_OK',
    description:
      'Update cash record by modifying cashIn, cashOut, or totalbalance amounts',
  })
  @ApiBody({
    description: 'Cash amounts to update',
    schema: {
      type: 'object',
      properties: {
        cashIn: {
          type: 'number',
          format: 'decimal',
          description: 'Updated cash in amount',
          example: 15000.5,
        },
        cashOut: {
          type: 'number',
          format: 'decimal',
          description: 'Updated cash out amount',
          example: 8500.25,
        },
        totalbalance: {
          type: 'number',
          format: 'decimal',
          description: 'Updated total balance',
          example: 6500.25,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cash record updated successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          referenceNo: 'CASH001',
          cashType: 'CASH_IN',
          cashIn: 15000.5,
          cashOut: 8500.25,
          totalbalance: 6500.25,
          cashDate: '2025-01-12T00:00:00Z',
          description: 'Daily cash count',
          createdAt: '2025-01-12T10:00:00Z',
          updatedAt: '2025-01-12T15:30:00Z',
        },
        message: 'Cash record updated successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid cash ID or amounts',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async updateCash(@Param('id') cashId: string, @Body() dto: UpdateCashDto) {
    return this.financeService.updateCash(
      cashId,
      dto.cashIn,
      dto.cashOut,
      dto.totalbalance,
    );
  }

  // Provision Endpoints
  @Post('provision/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new provision: Test_OK',
    description: 'Create a provision record.',
  })
  @ApiBody({
    description: 'Provision data',
    schema: {
      type: 'object',
      required: ['name', 'amount', 'startDate', 'endDate', 'probability'],
      properties: {
        name: {
          type: 'string',
          example: 'Q1 2025 Provision',
          description: 'Provision name (required)',
        },
        amount: {
          type: 'number',
          format: 'float',
          example: 50000.0,
          description: 'Provision amount (required)',
        },
        expectedValue: {
          type: 'number',
          format: 'float',
          example: 50000.0,
          description: 'Expected value of the provision (required)',
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-01T00:00:00Z',
          description: 'Start date in ISO 8601 format (required)',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-03-31T00:00:00Z',
          description: 'End date in ISO 8601 format (required)',
        },
        probability: {
          type: 'number',
          format: 'float',
          example: 0.85,
          description: 'Probability of provision (0-1) (required)',
        },
        provisionStatus: {
          type: 'string',
          enum: ['DRAFT', 'POSTED'],
          example: 'DRAFT',
          description:
            'Optional provision status (defaults to DRAFT if not provided)',
        },
        description: {
          type: 'string',
          example: 'Contingent liability provision',
          description: 'Optional description',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Provision created successfully: Test_OK',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          name: 'Q1 2025 Provision',
          amount: 50000,
          expectedValue: 50000,
          description: 'Contingent liability provision',
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-03-31T00:00:00Z',
          probability: 0.85,
          provisionStatus: 'DRAFT',
          isDeleted: false,
          createdAt: '2025-01-10T12:30:00Z',
          updatedAt: '2025-01-10T12:30:00Z',
        },
        message: 'Provision created successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid provision data: Test_OK',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async createProvision(
    @Body() dto: CreateProvisionDto,
    @GetUser() user: JWTPayload,
  ) {
    // Validate required fields
    if (
      !dto.name ||
      dto.amount === undefined ||
      !dto.startDate ||
      !dto.endDate ||
      dto.probability === undefined
    ) {
      throw new BadRequestException(
        'Missing required fields: name, amount, startDate, endDate, probability',
      );
    }

    if (!user) {
      throw new BadRequestException('User authentication required');
    }

    return this.financeService.createProvision({
      dto,
      user,
    });
  }

  // Search and filter provisions
  @Get('provisions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search and filter provisions with pagination: Test_OK',
    description:
      'Search provisions by name and filter by posting status with pagination support',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Search by provision name (case-insensitive partial match)',
    example: 'Legal reserve',
  })
  @ApiQuery({
    name: 'provisionStatus',
    required: false,
    enum: ['DRAFT', 'POSTED'],
    description: 'Filter by posting status',
    example: 'DRAFT',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Provisions search results with pagination',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            name: 'Q1 2025 Provision',
            amount: 50000,
            description: 'Contingent liability provision',
            startDate: '2025-01-01T00:00:00Z',
            endDate: '2025-03-31T00:00:00Z',
            probability: 0.85,
            isDeleted: false,
            createdAt: '2025-01-10T12:30:00Z',
            updatedAt: '2025-01-10T12:30:00Z',
          },
        ],
        metadata: {
          total: 45,
          page: 1,
          limit: 10,
          totalPages: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async searchProvisions(
    @Query('name') name?: string,
    @Query('provisionStatus') provisionStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.searchProvisions(
      name,
      provisionStatus,
      page,
      limit,
    );
  }

  // Draft provisions summary
  @Get('provisions/draft/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get draft provisions summary: Test_OK',
    description: 'Get total count and total amount of all DRAFT provisions',
  })
  @ApiResponse({
    status: 200,
    description: 'Draft provisions summary retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          totalCount: 2,
          totalAmount: 125000,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getDraftProvisionsSummary() {
    return this.financeService.getDraftProvisionsSummary();
  }

  @Patch('provisions/update/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({
    summary: 'Update a provision',
    description:
      'Update provision fields including name, amount, expectedValue, startDate, endDate, probability, and provisionStatus. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    description: 'Provision ID to update',
    type: String,
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    type: String,
    description: 'Provision name',
    example: 'Updated Provision Name',
  })
  @ApiQuery({
    name: 'amount',
    required: false,
    type: Number,
    description: 'Provision amount',
    example: 50000,
  })
  @ApiQuery({
    name: 'expectedValue',
    required: false,
    type: Number,
    description: 'Expected value',
    example: 55000,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date (ISO format)',
    example: '2026-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date (ISO format)',
    example: '2026-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'probability',
    required: false,
    type: Number,
    description: 'Probability (0-1)',
    example: 0.8,
  })
  @ApiQuery({
    name: 'provisionStatus',
    required: false,
    enum: ['DRAFT', 'POSTED'],
    description: 'Provision status',
    example: 'POSTED',
  })
  @ApiQuery({
    name: 'description',
    required: false,
    type: String,
    description: 'Provision description',
    example: 'Updated description',
  })
  @ApiResponse({
    status: 200,
    description: 'Provision updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            amount: { type: 'number' },
            expectedValue: { type: 'number' },
            description: { type: 'string', nullable: true },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            probability: { type: 'number' },
            provisionStatus: { type: 'string', enum: ['DRAFT', 'POSTED'] },
            isDeleted: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
      example: {
        success: true,
        data: {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          name: 'Updated Provision',
          amount: 50000,
          expectedValue: 55000,
          description: 'Updated description',
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-12-31T23:59:59Z',
          probability: 0.8,
          provisionStatus: 'POSTED',
          isDeleted: false,
          createdAt: '2025-12-01T10:00:00Z',
          updatedAt: '2026-01-28T15:30:00Z',
        },
        message: 'Provision updated successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - invalid provision ID, not found, or no fields to update',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async updateProvision(
    @Param('id') id: string,
    @Query() query: UpdateProvisionDto,
  ) {
    return this.financeService.updateProvision(id, query);
  }

  @Delete('provision/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Permanently delete a provision',
    description:
      'Permanently delete a provision record from the database. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'Provision ID to delete',
    type: String,
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Provision permanently deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
      example: {
        success: true,
        message: 'Provision permanently deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid provision ID or not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async deleteProvision(@Param('id') id: string) {
    return this.financeService.deleteProvisionPermanently(id);
  }

  // Invoice Endpoints
  @Post('invoice/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new invoice: Test_OK',
    description:
      'Create an invoice record linked to a document with optional file attachments.',
  })
  @ApiBody({
    description: 'Invoice data with optional file uploads',
    schema: {
      type: 'object',
      required: ['invoiceType', 'amount', 'invoiceDate', 'invoiceStatus'],
      properties: {
        invoiceType: {
          type: 'string',
          enum: ['SELLS', 'EXPENSE'],
          example: 'SELLS',
          description: 'Type of invoice (required)',
        },
        orgName: {
          type: 'string',
          example: 'ABC Corporation',
          description: 'Optional organization name',
        },
        clientId: {
          type: 'string',
          example: 'client-uuid-123',
          description: 'Optional client ID (for SELLS invoices)',
        },
        supplierName: {
          type: 'string',
          example: 'XYZ Suppliers',
          description: 'Optional supplier name (for EXPENSE invoices)',
        },
        description: {
          type: 'string',
          example: 'Monthly services invoice',
          description: 'Optional invoice description',
        },
        amount: {
          type: 'number',
          format: 'decimal',
          example: 5000.5,
          description: 'Invoice amount (required)',
        },
        vat: {
          type: 'number',
          format: 'decimal',
          example: 15.75,
          description: 'Optional VAT amount',
        },
        invoiceDate: {
          type: 'string',
          format: 'date-time',
          example: '2025-01-10T00:00:00Z',
          description: 'Invoice date in ISO 8601 format (required)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Invoice created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          documentId: 'uuid',
          invoiceType: 'SELLS',
          orgName: 'ABC Corporation',
          supplierName: 'XYZ Suppliers',
          description: 'Monthly services invoice',
          amount: '5000.50',
          discount: '500.00',
          vat: '945.09',
          invoiceDate: '2025-01-10T00:00:00Z',
          invoiceStatus: 'PENDING',
          document: {
            id: 'uuid',
            folderId: 'uuid',
            uploadedBy: 'uuid',
            uploaderRole: 'EMPLOYEE',
            name: 'Invoice_timestamp',
            status: 'PENDING',
            documentCateory: 'ORG_INVOICE_OUT',
          },
          createdAt: '2025-01-10T12:30:00Z',
          updatedAt: '2025-01-10T12:30:00Z',
        },
        message: 'Invoice created successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid invoice data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async createInvoice(
    @Body() dto: CreateInvoiceDto,
    @GetUser() user: JWTPayload,
  ) {
    if (!user) {
      throw new BadRequestException('User authentication required');
    }

    return this.financeService.createInvoice({
      dto,
      user,
    });
  }

  // Get all invoices with optional filter by InvoiceType
  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get all invoices with search, filter and pagination (Unified API): Test_OK',
    description:
      'Unified endpoint to retrieve, search, and filter all invoices (SELLS & EXPENSE). Combines functionality of sells-invoices/search, expense-invoices/search, accounts-receivable, and accounts-payable. Supports searching by name/description, filtering by type and status, and pagination.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by invoice ID)',
    example: 'ABC Corporation',
  })
  @ApiQuery({
    name: 'invoiceType',
    required: false,
    type: String,
    enum: ['SELLS', 'EXPENSE'],
    description: 'Filter by invoice type (SELLS or EXPENSE)',
    example: 'SELLS',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    type: String,
    description: 'Filter by client ID (for SELLS invoices)',
    example: 'client-uuid-123',
  })
  @ApiQuery({
    name: 'invoiceStatus',
    required: false,
    type: String,
    enum: ['PENDING', 'PAID', 'DUE'],
    description: 'Filter by invoice status',
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts from 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10, max: 100)',
    example: 10,
  })
  async getInvoices(
    @Query('search') search?: string,
    @Query('invoiceType') invoiceType?: string,
    @Query('clientId') clientId?: string,
    @Query('invoiceStatus') invoiceStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.getInvoices(
      search,
      invoiceType,
      clientId,
      invoiceStatus,
      page,
      limit,
    );
  }

  // Get invoice by ID
  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get invoice by ID: Test_OK',
    description: 'Retrieve a single invoice by its unique ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            invoiceType: {
              type: 'string',
              enum: ['SELLS', 'EXPENSE'],
              example: 'SELLS',
            },
            orgName: { type: 'string', example: 'ABC Corporation' },
            supplierName: { type: 'string', example: 'XYZ Suppliers' },
            description: {
              type: 'string',
              example: 'Monthly services invoice',
            },
            amount: { type: 'number', example: 5000.5 },
            discount: { type: 'number', example: 500.0 },
            vat: { type: 'number', example: 15 },
            transaction: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                document: {
                  type: 'object',
                  properties: {
                    files: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          url: { type: 'string', description: 'File URL' },
                        },
                      },
                    },
                  },
                },
                transactionType: { type: 'string' },
              },
            },
            invoiceDate: {
              type: 'string',
              format: 'date-time',
              example: '2025-01-10T00:00:00Z',
            },
            invoiceStatus: {
              type: 'string',
              enum: ['PENDING', 'PAID', 'DUE'],
              example: 'PENDING',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid invoice ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getInvoiceById(@Param('id') invoiceId: string) {
    return this.financeService.getInvoiceById(invoiceId);
  }

  // Get current client invoices
  @Get('invoices/client/current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current client invoices',
    description:
      'Retrieve all invoices for the currently authenticated client. Returns invoices with associated files from transactions and payments. Only accessible by clients.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client invoices fetched successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              invoiceType: { type: 'string', enum: ['SELLS', 'EXPENSE'] },
              orgName: { type: 'string' },
              supplierName: { type: 'string' },
              description: { type: 'string' },
              amount: { type: 'number' },
              discount: { type: 'number' },
              vat: { type: 'number' },
              vatAmount: { type: 'number' },
              invoiceDate: { type: 'string', format: 'date-time' },
              invoiceStatus: {
                type: 'string',
                enum: ['PENDING', 'PAID', 'DUE'],
              },
              transaction: { type: 'object' },
              payments: { type: 'object' },
            },
          },
        },
        total: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid client ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getCurrentClientInvoices(@GetUser() user: JWTPayload) {
    return this.financeService.getCurrentClientInvoices(user.sub);
  }

  // Update invoice status
  @Patch('invoice/status-update/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update invoice status by invoice ID: Test_OK',
    description:
      'Update the invoice status (PENDING, PAID, or DUE) for a specific invoice record using URL parameter',
  })
  @ApiBody({
    description: 'New invoice status',
    schema: {
      type: 'object',
      properties: {
        invoiceStatus: {
          type: 'string',
          enum: ['PENDING', 'PAID', 'DUE'],
          description: 'The new invoice status',
          example: 'PAID',
        },
      },
      required: ['invoiceStatus'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Invoice status updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            invoiceId: { type: 'string' },
            invoiceType: { type: 'string', enum: ['SELLS', 'EXPENSE'] },
            orgName: { type: 'string' },
            supplierName: { type: 'string' },
            description: { type: 'string' },
            amount: { type: 'string' },
            discount: { type: 'string' },
            vat: { type: 'string' },
            invoiceDate: { type: 'string', format: 'date-time' },
            invoiceStatus: { type: 'string', enum: ['PENDING', 'PAID', 'DUE'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
      example: {
        success: true,
        data: {
          invoiceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          invoiceType: 'SELLS',
          orgName: 'ABC Corporation',
          supplierName: 'XYZ Suppliers',
          description: 'Monthly services invoice',
          amount: '5000.50',
          discount: '500.00',
          vat: '945.09',
          invoiceDate: '2025-01-10T00:00:00Z',
          invoiceStatus: 'PAID',
          createdAt: '2025-01-10T12:30:00Z',
          updatedAt: '2026-01-22T14:45:00Z',
        },
        message: 'Invoice status updated successfully from PENDING to PAID',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid invoice ID or status',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async updateInvoiceStatus(
    @Param('id') invoiceId: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.financeService.updateInvoiceStatus(
      invoiceId,
      dto.invoiceStatus,
    );
  }

  // Upload file to invoice
  @Post('invoice/file-upload/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'file', maxCount: 1 }]))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload a file to an invoice: Test_OK',
    description:
      'Upload a single file and attach it to an existing invoice. The file is uploaded to Cloudinary and linked to the invoice.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'Invoice ID',
    type: String,
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiBody({
    description: 'File upload for invoice',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description:
            'Invoice file (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, etc.)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            invoiceId: { type: 'string' },
            fileId: { type: 'string' },
            url: { type: 'string' },
            mimeType: { type: 'string' },
            sizeKB: { type: 'number' },
            extension: { type: 'string' },
          },
        },
        message: { type: 'string' },
      },
      example: {
        success: true,
        data: {
          invoiceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          fileId: 'file-uuid',
          url: 'https://cloudinary.url/invoice.pdf',
          mimeType: 'application/pdf',
          sizeKB: 250,
          extension: 'pdf',
        },
        message: 'File uploaded successfully to invoice',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid invoice ID or no file provided',
  })
  @ApiResponse({
    status: 404,
    description: 'Invoice not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async uploadInvoiceFile(
    @Param('id') invoiceId: string,
    @GetUser() user: JWTPayload,
    @UploadedFiles()
    uploadedFiles?: {
      file?: Express.Multer.File[];
    },
  ) {
    if (!uploadedFiles?.file || uploadedFiles.file.length === 0) {
      throw new BadRequestException('File is required');
    }

    return this.financeService.uploadInvoiceFile(
      invoiceId,
      user,
      uploadedFiles.file[0],
    );
  }

  // Notification Endpoints
  @Post('notification/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send notification to users',
    description:
      'Send a notification to one or multiple users by providing their user IDs, a title, message, and notification type.',
  })
  @ApiBody({
    description: 'Notification details with user IDs',
    schema: {
      type: 'object',
      required: ['userIds', 'title', 'message', 'type'],
      properties: {
        userId: {
          type: 'string',
          description: 'User ID to receive the notification',
          example: 'user-id-1',
        },
        title: {
          type: 'string',
          minLength: 3,
          maxLength: 100,
          description: 'Notification title',
          example: 'Payment Reminder',
        },
        message: {
          type: 'string',
          minLength: 5,
          maxLength: 500,
          description: 'Notification message',
          example:
            'Your invoice payment is due. Please make payment at your earliest convenience.',
        },
        type: {
          type: 'string',
          description: 'Notification type for categorization',
          example: 'PAYMENT_REMINDER',
        },
        sentAt: {
          type: 'string',
          format: 'date-time',
          description: 'Timestamp when notification is sent',
          example: '2026-01-12T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notification sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            notificationId: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            type: { type: 'string' },
            recipientCount: { type: 'number' },
            recipients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  email: { type: 'string' },
                  fullName: { type: 'string' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid input or user not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async sendNotification(@Body() dto: CreateNotificationDto) {
    return this.financeService.sendNotification(
      dto.userId,
      dto.title,
      dto.message,
      dto.type,
    );
  }

  // VAT Return Endpoints
  @Post('vat-return/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({
    summary: 'Create a VAT return record based on paid invoices: Test_OK',
    description:
      'Create a new VAT return record with automatic calculation of inVat, outVat, and netVat based on paid invoices. For MONTHLY periods, filters invoices by specific month and year (e.g., JANUARY 2025). For QUARTERLY periods, filters by quarter (Q1-Q4) and year (e.g., Q2 2025 includes Apr-Jun). SELLS invoices contribute to inVat, EXPENSE invoices contribute to outVat, and netVat is calculated as inVat - outVat.',
  })
  @ApiBody({
    description:
      'VAT Return data - filters all PAID invoices within the specified period and calculates VAT amounts automatically',
    examples: {
      monthly: {
        summary: 'Monthly VAT Return (January 2025)',
        description:
          'Creates VAT return for a specific month - filters all paid invoices from Jan 1-31, 2025',
        value: {
          periodType: 'MONTHLY',
          years: 2025,
          period: 'JANUARY',
        },
      },
      quarterly: {
        summary: 'Quarterly VAT Return (Q2 2025)',
        description:
          'Creates VAT return for second quarter - filters all paid invoices from Apr 1 - Jun 30, 2025',
        value: {
          periodType: 'QUARTERLY',
          years: 2025,
          period: 'Q2',
        },
      },
      currentMonth: {
        summary: 'Current Month (January 2026)',
        description: 'Creates VAT return for current month',
        value: {
          periodType: 'MONTHLY',
          years: 2026,
          period: 'JANUARY',
        },
      },
    },
    schema: {
      type: 'object',
      required: ['periodType', 'years', 'period'],
      properties: {
        periodType: {
          type: 'string',
          enum: ['MONTHLY', 'QUARTERLY'],
          example: 'MONTHLY',
          description:
            'VAT period type - determines how invoices are filtered by date range',
        },
        years: {
          type: 'number',
          example: 2025,
          minimum: 2020,
          maximum: 2030,
          description: 'Year for the VAT return (must be a valid 4-digit year)',
        },
        period: {
          type: 'string',
          enum: [
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
          ],
          example: 'JANUARY',
          description:
            'Period - Month name (JANUARY-DECEMBER) for MONTHLY type or Quarter (Q1-Q4) for QUARTERLY type. Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'VAT return created successfully with calculated VAT amounts',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            periodType: { type: 'string', enum: ['MONTHLY', 'QUARTERLY'] },
            years: { type: 'number' },
            period: { type: 'string' },
            vatStatus: {
              type: 'string',
              enum: ['PENDING', 'SUBMITTED', 'PAID'],
            },
            outVat: {
              type: 'number',
              description: 'VAT from expense invoices',
            },
            inVat: {
              type: 'number',
              description: 'VAT from sales invoices',
            },
            netVat: {
              type: 'number',
              description: 'Net VAT (inVat - outVat)',
            },
            jurisdictions: { type: 'string', nullable: true },
            documentId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
      example: {
        success: true,
        data: {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          periodType: 'MONTHLY',
          years: 2025,
          period: 'JANUARY',
          vatStatus: 'PENDING',
          inVat: 15000.5,
          outVat: 8500.25,
          netVat: 6500.25,
          jurisdictions: null,
          documentId: null,
          createdAt: '2025-01-23T10:30:00Z',
          updatedAt: '2025-01-23T10:30:00Z',
        },
        message: 'VAT Return created successfully with 45 paid invoice(s)',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid VAT return data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async createVatReturn(
    @Body() dto: CreateVatReturnDto,
    @GetUser() user: JWTPayload,
  ) {
    return this.financeService.createVatReturn({ dto, user });
  }

  // Get all VAT return records
  @Get('vat-return')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all VAT return records with filter and pagination: Test_OK',
    description:
      'Retrieve all VAT return records with optional filter by VAT status and pagination support',
  })
  @ApiQuery({
    name: 'vatStatus',
    required: false,
    type: String,
    enum: ['PENDING', 'SUBMITTED', 'PAID'],
    description: 'Filter by VAT status',
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by period (e.g., JANUARY, Q1) or year (e.g., 2025)',
    example: 'JANUARY',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'VAT return records retrieved successfully with pagination',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              periodType: { type: 'string', enum: ['MONTHLY', 'QUARTERLY'] },
              years: { type: 'number' },
              period: { type: 'string' },
              vatStatus: {
                type: 'string',
                enum: ['PENDING', 'SUBMITTED', 'PAID'],
              },
              outVat: { type: 'number', nullable: true },
              inVat: { type: 'number', nullable: true },
              netVat: { type: 'number', nullable: true },
              jurisdictions: { type: 'string', nullable: true },
              documentId: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Total number of VAT returns',
            },
            page: { type: 'number', description: 'Current page number' },
            limit: { type: 'number', description: 'Records per page' },
            totalPages: {
              type: 'number',
              description: 'Total number of pages',
            },
          },
        },
      },
      example: {
        success: true,
        data: [
          {
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            periodType: 'MONTHLY',
            years: 2025,
            period: 'JANUARY',
            vatStatus: 'PENDING',
            inVat: 15000.5,
            outVat: 8500.25,
            netVat: 6500.25,
            jurisdictions: null,
            documentId: null,
            createdAt: '2025-01-23T10:30:00Z',
            updatedAt: '2025-01-23T10:30:00Z',
          },
        ],
        metadata: {
          total: 45,
          page: 1,
          limit: 10,
          totalPages: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getVatReturns(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('vatStatus') vatStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.financeService.getVatReturns(page, limit, vatStatus, search);
  }

  @Get('vat-return/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a specific VAT return record by ID',
    description:
      'Retrieve a single VAT return record by its ID with all related document files',
  })
  @ApiParam({
    name: 'id',
    description: 'VAT Report ID',
    type: String,
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'VAT return record retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            periodType: {
              type: 'string',
              enum: ['MONTHLY', 'QUARTERLY'],
            },
            years: { type: 'number' },
            period: { type: 'string' },
            vatStatus: {
              type: 'string',
              enum: ['PENDING', 'SUBMITTED', 'PAID'],
            },
            outVat: { type: 'number', nullable: true },
            inVat: { type: 'number', nullable: true },
            netVat: { type: 'number', nullable: true },
            jurisdictions: { type: 'string', nullable: true },
            documentId: { type: 'string', nullable: true },
            fileUrls: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fileId: { type: 'string' },
                  url: { type: 'string' },
                  mimeType: { type: 'string' },
                  sizeKB: { type: 'number' },
                  extension: { type: 'string' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
      example: {
        success: true,
        data: {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          periodType: 'MONTHLY',
          years: 2025,
          period: 'JANUARY',
          vatStatus: 'PENDING',
          inVat: 15000.5,
          outVat: 8500.25,
          netVat: 6500.25,
          jurisdictions: 'United States, European Union',
          documentId: 'abc-123-def-456',
          fileUrls: [
            {
              fileId: 'file-uuid-1',
              url: 'https://cloudinary.com/vat-report-1.pdf',
              mimeType: 'application/pdf',
              sizeKB: 245,
              extension: 'pdf',
            },
          ],
          createdAt: '2025-01-23T10:30:00Z',
          updatedAt: '2025-01-23T10:30:00Z',
        },
        message: 'VAT Report retrieved successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid VAT Report ID or not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getVatReturnById(@Param('id') id: string) {
    return this.financeService.getVatReturnById(id);
  }

  // Update VAT Report for Regulatory Reporting
  @Patch('vat-return/regulatory-reporting/update/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 10 }]))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update VAT Report for regulatory reporting: Test_OK',
    description:
      'Update a VAT Report with jurisdictions and upload regulatory documents. Files are uploaded to Cloudinary and linked to the VAT Report via a document record.',
  })
  @ApiParam({
    name: 'id',
    description: 'VAT Report ID to update',
    type: String,
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'VAT Report update data with file uploads',
    schema: {
      type: 'object',
      required: ['jurisdictions'],
      properties: {
        jurisdictions: {
          type: 'string',
          description: 'Jurisdictions for the VAT report (comma-separated)',
          example: 'United States, European Union, United Kingdom',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Regulatory documents (max 10 files)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'VAT Report updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            periodType: {
              type: 'string',
              enum: ['MONTHLY', 'QUARTERLY'],
            },
            years: { type: 'number' },
            period: { type: 'string' },
            vatStatus: {
              type: 'string',
              enum: ['PENDING', 'SUBMITTED', 'PAID'],
            },
            jurisdictions: { type: 'string' },
            documentId: { type: 'string' },
            fileUrls: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fileId: { type: 'string' },
                  url: { type: 'string' },
                  mimeType: { type: 'string' },
                  sizeKB: { type: 'number' },
                  extension: { type: 'string' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - invalid VAT Report ID or missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async updateVatReport(
    @GetUser() user: JWTPayload,
    @Param('id') id: string,
    @Body() dto: UpdateVatReportDto,
    @UploadedFiles() uploadedFiles?: { files?: Express.Multer.File[] },
  ) {
    return this.financeService.updateVatReport(
      user.sub,
      id,
      dto.jurisdictions,
      uploadedFiles?.files,
    );
  }

  @Patch('vat-return/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('application/x-www-form-urlencoded')
  @ApiOperation({
    summary: 'Update VAT Report Status',
    description:
      'Update the status of a VAT Report. Valid statuses are: PENDING, SUBMITTED, PAID.',
  })
  @ApiParam({
    name: 'id',
    description: 'VAT Report ID to update',
    type: String,
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiBody({
    description: 'VAT Status update data',
    examples: {
      submitted: {
        summary: 'Mark as Submitted',
        value: {
          vatStatus: 'SUBMITTED',
        },
      },
      paid: {
        summary: 'Mark as Paid',
        value: {
          vatStatus: 'PAID',
        },
      },
      pending: {
        summary: 'Mark as Pending',
        value: {
          vatStatus: 'PENDING',
        },
      },
    },
    schema: {
      type: 'object',
      required: ['vatStatus'],
      properties: {
        vatStatus: {
          type: 'string',
          enum: ['PENDING', 'SUBMITTED', 'PAID'],
          example: 'SUBMITTED',
          description: 'New VAT status',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'VAT Report status updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            periodType: {
              type: 'string',
              enum: ['MONTHLY', 'QUARTERLY'],
            },
            years: { type: 'number' },
            period: { type: 'string' },
            vatStatus: {
              type: 'string',
              enum: ['PENDING', 'SUBMITTED', 'PAID'],
            },
            outVat: { type: 'number', nullable: true },
            inVat: { type: 'number', nullable: true },
            netVat: { type: 'number', nullable: true },
            jurisdictions: { type: 'string', nullable: true },
            documentId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid VAT Report ID or invalid status value',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async updateVatStatus(
    @Param('id') id: string,
    @Body() dto: UpdateVatStatusDto,
  ) {
    return this.financeService.updateVatStatus(id, dto.vatStatus);
  }

  // Payment Endpoints
  @Post('payment/create')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 10 }]))
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a payment record with file uploads: Test_OK',
    description:
      'Create a payment record linked to an invoice with mandatory file attachments. Files are uploaded to Cloudinary. Vendor can be provided or will be derived from invoice. Payment status defaults to PENDING if not provided.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Payment data with file uploads',
    schema: {
      type: 'object',
      required: [
        'invoiceId',
        'amount',
        'paymentMethod',
        'paymentDate',
        'files',
      ],
      properties: {
        vendor: {
          type: 'string',
          example: 'ABC Corporation',
          description:
            'Vendor name (optional - will be derived from invoice if not provided)',
        },
        invoiceId: {
          type: 'string',
          example: '12345-abc-def-789',
          description: 'Invoice ID to link payment to',
        },
        amount: {
          type: 'number',
          format: 'decimal',
          example: 5000.5,
          description: 'Payment amount',
        },
        paymentMethod: {
          type: 'string',
          enum: ['BANK', 'CASH', 'CARD'],
          example: 'BANK',
          description: 'Payment method used',
        },
        paymentDate: {
          type: 'string',
          format: 'date-time',
          example: '2026-01-22T10:30:00Z',
          description: 'Date when payment was made',
        },
        paymentStatus: {
          type: 'string',
          enum: ['COMPLETED', 'PENDING'],
          example: 'PENDING',
          description: 'Payment status (optional - defaults to PENDING)',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description:
            'Mandatory payment file uploads (up to 10 files - PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, etc.)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            invoiceId: { type: 'string' },
            vendor: {
              type: 'string',
              description: 'Organization or supplier name from invoice',
            },
            amount: { type: 'number' },
            paymentMethod: { type: 'string', enum: ['BANK', 'CASH', 'CARD'] },
            paymentStatus: { type: 'string', enum: ['PENDING', 'COMPLETED'] },
            paymentDate: { type: 'string', format: 'date-time' },
            documentId: { type: 'string' },
            fileUrls: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fileId: { type: 'string' },
                  url: { type: 'string' },
                  mimeType: { type: 'string' },
                  sizeKB: { type: 'number' },
                  extension: { type: 'string' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid payment data, invoice not found, or no files provided',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @GetUser() user: JWTPayload,
    @UploadedFiles()
    uploadedFiles?: {
      files?: Express.Multer.File[];
    },
  ) {
    // Validate required fields
    if (
      !dto.invoiceId ||
      !dto.amount ||
      !dto.paymentMethod ||
      !dto.paymentDate
    ) {
      throw new BadRequestException(
        'Missing required fields: invoiceId, amount, paymentMethod, paymentDate',
      );
    }

    if (!uploadedFiles?.files || uploadedFiles.files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    if (!user) {
      throw new BadRequestException('User authentication required');
    }

    return this.financeService.createPayment({
      dto,
      user,
      files: uploadedFiles.files,
    });
  }

  // Get all payment records with search and filters
  @Get('payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all payment records with search and filters: Test_OK',
    description:
      'Retrieve payment records with optional search by vendor/invoice ID and filters by payment method and status. Supports pagination.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by vendor name or invoice ID (case-insensitive)',
    example: 'ABC Corp',
  })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    enum: ['BANK', 'CASH', 'CARD'],
    description: 'Filter by payment method',
    example: 'BANK',
  })
  @ApiQuery({
    name: 'paymentStatus',
    required: false,
    enum: ['PENDING', 'COMPLETED'],
    description: 'Filter by payment status',
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment records retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              invoiceId: { type: 'string' },
              vendor: { type: 'string' },
              amount: { type: 'number' },
              paymentMethod: { type: 'string', enum: ['BANK', 'CASH', 'CARD'] },
              paymentStatus: { type: 'string', enum: ['PENDING', 'COMPLETED'] },
              paymentDate: { type: 'string', format: 'date-time' },
              documents: {
                type: 'object',
                properties: {
                  files: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        url: { type: 'string', description: 'File URL' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            total: { type: 'number', description: 'Total number of payments' },
            page: { type: 'number', description: 'Current page number' },
            limit: { type: 'number', description: 'Records per page' },
            totalPages: {
              type: 'number',
              description: 'Total number of pages',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getPayments(
    @Query('search') search?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.getPayments(
      search,
      paymentMethod,
      paymentStatus,
      page,
      limit,
    );
  }

  // Update payment status by payment ID
  @Patch('payment/update-status/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update payment status by payment ID: Test_OK',
    description:
      'Update the payment status (PENDING or COMPLETED) for a specific payment record using URL parameter',
  })
  @ApiBody({
    description: 'New payment status',
    schema: {
      type: 'object',
      properties: {
        paymentStatus: {
          type: 'string',
          enum: ['PENDING', 'COMPLETED'],
          description: 'The new payment status',
          example: 'COMPLETED',
        },
      },
      required: ['paymentStatus'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            invoiceId: { type: 'string' },
            vendor: { type: 'string' },
            amount: { type: 'number' },
            paymentMethod: { type: 'string', enum: ['BANK', 'CASH', 'CARD'] },
            paymentStatus: { type: 'string', enum: ['PENDING', 'COMPLETED'] },
            paymentDate: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid payment ID or status',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async updatePaymentStatus(
    @Param('id') paymentId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.financeService.updatePaymentStatus(
      paymentId,
      dto.paymentStatus,
    );
  }

  // Bank Reconciliation Endpoints
  @Get('bank-reconciliations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Search bank reconciliations by invoiceId and filter by ReconciliationStatus with pagination: Test_OK',
    description:
      'Search bank reconciliation records by invoice ID, filter by reconciliation status, and support pagination',
  })
  @ApiQuery({
    name: 'invoiceId',
    required: false,
    type: String,
    description: 'Search by invoice ID (case-insensitive partial match)',
    example: '12345-abc-def',
  })
  @ApiQuery({
    name: 'reconciliationStatus',
    required: false,
    type: String,
    enum: ['PENDING', 'ADJUSTMENT', 'MATCH', 'FAILED'],
    description: 'Filter by reconciliation status',
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description:
      'Bank reconciliation records retrieved successfully with pagination',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            vendor: 'ABC Corporation',
            invoiceId: '12345-abc-def-789',
            ledgerAmount: 5000.5,
            backAmount: 5000.5,
            reconciliationStatus: 'MATCH',
            paymentDate: '2026-01-22T00:00:00Z',
            createdAt: '2026-01-22T10:30:00Z',
            updatedAt: '2026-01-22T10:30:00Z',
          },
        ],
        metadata: {
          total: 45,
          page: 1,
          limit: 10,
          totalPages: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async searchBankReconciliations(
    @Query('invoiceId') invoiceId?: string,
    @Query('reconciliationStatus') reconciliationStatus?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.searchBankReconciliations(
      invoiceId,
      reconciliationStatus,
      page,
      limit,
    );
  }

  @Patch('bank-reconciliation/update/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update bank reconciliation status by ID: Test_OK',
    description:
      'Update the reconciliation status (PENDING, ADJUSTMENT, MATCH, or FAILED) for a specific bank reconciliation record',
  })
  @ApiBody({
    description: 'New reconciliation status',
    schema: {
      type: 'object',
      properties: {
        reconciliationStatus: {
          type: 'string',
          enum: ['PENDING', 'ADJUSTMENT', 'MATCH', 'FAILED'],
          description: 'The new reconciliation status',
          example: 'MATCH',
        },
      },
      required: ['reconciliationStatus'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation status updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            vendor: { type: 'string' },
            invoiceId: { type: 'string' },
            ledgerAmount: { type: 'number' },
            backAmount: { type: 'number' },
            reconciliationStatus: {
              type: 'string',
              enum: ['PENDING', 'ADJUSTMENT', 'MATCH', 'FAILED'],
            },
            paymentDate: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
      example: {
        success: true,
        data: {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          vendor: 'ABC Corporation',
          invoiceId: '12345-abc-def-789',
          ledgerAmount: 5000.5,
          backAmount: 5000.5,
          reconciliationStatus: 'MATCH',
          paymentDate: '2026-01-22T00:00:00Z',
          createdAt: '2026-01-22T10:30:00Z',
          updatedAt: '2026-01-22T15:45:00Z',
        },
        message:
          'Reconciliation status updated successfully from PENDING to MATCH',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid reconciliation ID or status',
  })
  @ApiResponse({
    status: 404,
    description: 'Bank reconciliation not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async updateReconciliationStatus(
    @Param('id') reconciliationId: string,
    @Body() dto: UpdateReconciliationStatusDto,
  ) {
    return this.financeService.updateReconciliationStatus(
      reconciliationId,
      dto.reconciliationStatus,
    );
  }

  @Post('accrual-deferral/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create an accrual or deferral entry: Test_OK',
    description:
      'Create a new accrual or deferral entry for financial tracking and reporting',
  })
  @ApiBody({
    description: 'Accrual/Deferral data',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'Q1 Revenue Accrual',
          description: 'Name of the accrual/deferral entry (optional)',
        },
        period: {
          type: 'string',
          example: 'January 2026',
          description: 'Period for the accrual/deferral (optional)',
        },
        type: {
          type: 'string',
          enum: ['ACCRUAL', 'DEFERRAL'],
          example: 'ACCRUAL',
          description: 'Type of entry (required)',
        },
        description: {
          type: 'string',
          example: 'Revenue accrual for Q1 services',
          description: 'Description of the accrual/deferral (required)',
        },
        amount: {
          type: 'number',
          format: 'decimal',
          example: 5000.5,
          description: 'Amount for the accrual/deferral (required)',
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          example: '2026-01-01T00:00:00Z',
          description: 'Start date in ISO 8601 format (required)',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          example: '2026-01-31T23:59:59Z',
          description: 'End date in ISO 8601 format (required)',
        },
        status: {
          type: 'string',
          enum: ['DRAFT', 'POSTED'],
          example: 'DRAFT',
          description: 'Optional posting status (defaults to DRAFT)',
        },
      },
      required: ['type', 'description', 'amount', 'startDate', 'endDate'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Accrual/Deferral created successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          period: 'January 2026',
          type: 'ACCRUAL',
          description: 'Revenue accrual for Q1 services',
          amount: 5000.5,
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-01-31T23:59:59Z',
          status: 'DRAFT',
          isDeleted: false,
          createdAt: '2026-01-13T10:30:00Z',
          updatedAt: '2026-01-13T10:30:00Z',
        },
        message: 'Accrual/Deferral created successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid data provided',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async createAccrualDeferral(
    @Body() dto: CreateAccrualDeferralDto,
    @GetUser() user: JWTPayload,
  ) {
    return this.financeService.createAccrualDeferral({ dto, user });
  }

  @Get('accrual-deferral/get')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get all accrual/deferral entries with search, filter and pagination: Test_OK',
    description:
      'Retrieve all accrual/deferral entries with optional search by name or description, filter by PostingStatus, and pagination support',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or description (case-insensitive)',
    example: 'Q1 Revenue',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['DRAFT', 'POSTED'],
    description: 'Filter by PostingStatus',
    example: 'DRAFT',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (starts at 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description:
      'Accrual/Deferral entries retrieved successfully with pagination',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            period: 'January 2026',
            type: 'ACCRUAL',
            description: 'Revenue accrual for Q1 services',
            amount: 5000.5,
            status: 'DRAFT',
            isDeleted: false,
            createdAt: '2026-01-13T10:30:00Z',
            updatedAt: '2026-01-13T10:30:00Z',
          },
          {
            id: 'a47ac10b-58cc-4372-a567-0e02b2c3d480',
            period: 'December 2025',
            type: 'DEFERRAL',
            description: 'Expense deferral for maintenance',
            amount: 2500.0,
            status: 'POSTED',
            isDeleted: false,
            createdAt: '2026-01-12T08:00:00Z',
            updatedAt: '2026-01-12T08:00:00Z',
          },
        ],
        metadata: {
          total: 45,
          page: 1,
          limit: 10,
          totalPages: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getAccrualDeferrals(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.financeService.getAccrualDeferrals(search, status, page, limit);
  }

  @Patch('accrual-deferral/update/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update accrual/deferral entry by ID: Test_OK',
    description:
      'Update any field(s) for a specific accrual/deferral entry including name, period, type, description, amount, dates, and status',
  })
  @ApiBody({
    description: 'Update data for accrual/deferral (all fields optional)',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Optional new name',
          example: 'Updated Q1 Revenue Accrual',
        },
        period: {
          type: 'string',
          description: 'Optional new period',
          example: 'February 2026',
        },
        type: {
          type: 'string',
          enum: ['ACCRUAL', 'DEFERRAL'],
          description: 'Optional new type',
          example: 'DEFERRAL',
        },
        description: {
          type: 'string',
          description: 'Optional new description',
          example: 'Updated revenue accrual for Q1 services',
        },
        amount: {
          type: 'number',
          format: 'decimal',
          description: 'Optional new amount',
          example: 6000.75,
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          description: 'Optional new start date in ISO 8601 format',
          example: '2026-02-01T00:00:00Z',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          description: 'Optional new end date in ISO 8601 format',
          example: '2026-02-28T23:59:59Z',
        },
        status: {
          type: 'string',
          enum: ['DRAFT', 'POSTED'],
          description: 'Optional new status',
          example: 'POSTED',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Accrual/Deferral updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            period: { type: 'string' },
            type: { type: 'string', enum: ['ACCRUAL', 'DEFERRAL'] },
            description: { type: 'string' },
            amount: { type: 'number' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['DRAFT', 'POSTED'] },
            isDeleted: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
      example: {
        success: true,
        data: {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          period: 'January 2026',
          type: 'ACCRUAL',
          description: 'Revenue accrual for Q1 services',
          amount: 6000.75,
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-01-31T23:59:59Z',
          status: 'POSTED',
          isDeleted: false,
          createdAt: '2026-01-13T10:30:00Z',
          updatedAt: '2026-01-23T15:45:00Z',
        },
        message: 'Accrual/Deferral updated successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid ID, status, or amount',
  })
  @ApiResponse({
    status: 404,
    description: 'Accrual/Deferral not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async updateAccrualDeferral(
    @Param('id') accrualDeferralId: string,
    @Body() dto: UpdateAccrualDeferralDto,
  ) {
    return this.financeService.updateAccrualDeferral(accrualDeferralId, dto);
  }

  @Get('accrual-deferral/get/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get accrual/deferral entry by ID: Test_OK',
    description: 'Retrieve a specific accrual/deferral entry by its unique ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the accrual/deferral entry',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Accrual/Deferral retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          name: 'Q1 Revenue Accrual',
          period: 'January 2026',
          type: 'ACCRUAL',
          description: 'Revenue accrual for Q1 services',
          amount: 5000.5,
          startDate: '2026-01-01T00:00:00Z',
          endDate: '2026-01-31T23:59:59Z',
          status: 'DRAFT',
          isDeleted: false,
          createdAt: '2026-01-13T10:30:00Z',
          updatedAt: '2026-01-13T10:30:00Z',
        },
        message: 'Accrual/Deferral retrieved successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid ID or entry not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getAccrualDeferralById(@Param('id') accrualDeferralId: string) {
    return this.financeService.getAccrualDeferralById(accrualDeferralId);
  }

  @Get('accrual-deferral/summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get accrual/deferral summary: Test_OK',
    description:
      'Retrieve summary statistics of all accrual and deferral entries including total amounts for each type',
  })
  @ApiResponse({
    status: 200,
    description: 'Accrual/Deferral summary retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          totalAccruals: 15000.5,
          totalDeferrals: 8500.25,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAccrualDeferralSummary() {
    return this.financeService.getAccrualDeferralSummary();
  }

  @Delete('accrual-deferral/delete/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete finance data: Test_OK',
    description:
      'Delete all finance-related data for cleanup or reset purposes',
  })
  async deleteFinance(@Param('id') id: string) {
    return this.financeService.deleteFinance(id);
  }
}
