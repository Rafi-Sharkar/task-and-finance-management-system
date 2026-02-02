import { ApiResponseTypeChecker } from '@/common/swagger/response-typechecker.decorator';
import { successResponse } from '@/common/utils/response.util';
import { GetUser, GetUserId, ValidateEmployee } from '@/core/jwt/jwt.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { FilterDocumentDto } from './dto/filter-document.dto';
import { FilterFolderDocumentsDto } from './dto/filter-folder-documents.dto';
import { GetClientDocumentsDto } from './dto/get-client-documents.dto';
import { PaginatedDocumentResponseDto } from './dto/paginated-document-response.dto';
import { ShareToClientDto } from './dto/share-to-client.dto';
import { UpdateDocStatusByClientDto } from './dto/update-doc-status-by-client.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@ApiTags('Documents')
@Controller('documents')
@ValidateEmployee()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files', 1))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create a new document',
    description:
      'Upload a new document with a single file to a specific folder. You can optionally share it with clients during creation.',
  })
  @ApiBody({ type: CreateDocumentDto })
  @ApiResponseTypeChecker({
    model: DocumentResponseDto,
    successStatus: 201,
    successMessage: 'Document created successfully',
    successExampleData: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Invoice Q4 2025',
      folderId: '660e8400-e29b-41d4-a716-446655440001',
      uploadedBy: '770e8400-e29b-41d4-a716-446655440002',
      uploaderRole: 'EMPLOYEE',
      status: 'PENDING',
      shareToClient: false,
      clientShareTypes: 'VIEW',
      isSigned: false,
      documentCateory: 'CLIENT_INVOICE_IN',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      file: {
        id: '880e8400-e29b-41d4-a716-446655440003',
        url: 'https://placeholder-storage.example.com/documents/550e8400-e29b-41d4-a716-446655440000/1704764400000_invoice.pdf',
        mimeType: 'application/pdf',
        sizeKB: 256,
        extension: 'pdf',
        uploadedAt: new Date().toISOString(),
      },
      documentClients: [
        {
          id: '990e8400-e29b-41d4-a716-446655440004',
          clientId: 'aa0e8400-e29b-41d4-a716-446655440005',
          addedAt: new Date().toISOString(),
          client: {
            id: 'aa0e8400-e29b-41d4-a716-446655440005',
            fullName: 'John Doe',
            email: 'john.doe@example.com',
          },
        },
      ],
      folder: {
        id: '660e8400-e29b-41d4-a716-446655440001',
        name: 'Client Invoices',
        createdBy: '770e8400-e29b-41d4-a716-446655440002',
      },
      uploader: {
        id: '770e8400-e29b-41d4-a716-446655440002',
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
      },
    },
    errors: [
      {
        status: 400,
        message:
          'Please upload exactly one file or check that your file format is supported.',
      },
      {
        status: 404,
        message:
          "The folder you specified couldn't be found. Please verify the folder ID.",
      },
      { status: 401, message: 'You must be logged in to upload documents.' },
      {
        status: 500,
        message:
          'Something went wrong while uploading the document. Please try again.',
      },
    ],
  })
  async createDocument(
    @GetUserId() userId: string,
    @GetUser() user: any,
    @Body() dto: CreateDocumentDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const document = await this.documentService.createDocument(
      userId,
      user.role,
      dto,
      files,
    );
    const data = plainToInstance(DocumentResponseDto, document, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Your document has been created successfully');
  }

  @Get()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all documents with filters',
    description:
      'Retrieve all documents you have access to with advanced filtering options. Managers can see employee/client/finance documents, Admins can see all, and others see only their own.',
  })
  @ApiResponseTypeChecker({
    model: PaginatedDocumentResponseDto,
    successStatus: 200,
    successMessage: 'Documents retrieved successfully',
    successExampleData: {
      data: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Invoice Q4 2025',
          folderId: '660e8400-e29b-41d4-a716-446655440001',
          uploadedBy: '770e8400-e29b-41d4-a716-446655440002',
          status: 'APPROVED',
          shareToClient: true,
          clientShareTypes: 'VIEW',
          isSigned: false,
          documentCateory: 'CLIENT_INVOICE_IN',
          isDeleted: false,
          createdAt: '2026-01-10T10:00:00.000Z',
          updatedAt: '2026-01-10T10:00:00.000Z',
          file: {
            id: '880e8400-e29b-41d4-a716-446655440003',
            url: 'https://example.com/invoice.pdf',
            mimeType: 'application/pdf',
            sizeKB: 256,
            extension: 'pdf',
            uploadedAt: '2026-01-10T10:00:00.000Z',
          },
          uploader: {
            id: '770e8400-e29b-41d4-a716-446655440002',
            fullName: 'Jane Smith',
            email: 'jane.smith@example.com',
            username: 'jane.smith',
            role: 'EMPLOYEE',
          },
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440010',
          name: 'Project Contract',
          folderId: '660e8400-e29b-41d4-a716-446655440011',
          uploadedBy: '770e8400-e29b-41d4-a716-446655440012',
          status: 'PENDING',
          shareToClient: false,
          clientShareTypes: null,
          isSigned: true,
          documentCateory: 'PROJECT_DOC',
          isDeleted: false,
          createdAt: '2026-01-09T15:30:00.000Z',
          updatedAt: '2026-01-09T15:30:00.000Z',
          file: {
            id: '880e8400-e29b-41d4-a716-446655440013',
            url: 'https://example.com/contract.pdf',
            mimeType: 'application/pdf',
            sizeKB: 512,
            extension: 'pdf',
            uploadedAt: '2026-01-09T15:30:00.000Z',
          },
          uploader: {
            id: '770e8400-e29b-41d4-a716-446655440012',
            fullName: 'Manager User',
            email: 'manager@example.com',
            username: 'manager.user',
            role: 'MANAGER',
          },
        },
      ],
      total: 45,
      page: 1,
      limit: 10,
      totalPages: 5,
    },
    errors: [
      {
        status: 401,
        message:
          'You must be logged in to view documents. Please log in and try again.',
      },
      {
        status: 403,
        message: 'You do not have permission to view these documents.',
      },
    ],
  })
  async getAllDocuments(
    @GetUserId() userId: string,
    @GetUser() user: any,
    @Query() filters: FilterDocumentDto,
  ) {
    const result = await this.documentService.getAllDocumentsWithFilters(
      userId,
      user.role,
      filters,
    );
    return successResponse(result, 'Documents retrieved successfully');
  }

  @Get('folder/:folderId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get documents by folder',
    description:
      'Retrieve all documents in a specific folder that you have created with pagination and search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      "We couldn't find this folder. It may have been deleted or the ID is incorrect.",
  })
  async getDocumentsByFolder(
    @GetUserId() userId: string,
    @Param('folderId') folderId: string,
    @Query() filters: FilterFolderDocumentsDto,
  ) {
    const result = await this.documentService.getDocumentsByFolder(
      userId,
      folderId,
      filters,
    );

    const data = plainToInstance(DocumentResponseDto, result.data, {
      excludeExtraneousValues: true,
    });

    return successResponse(
      {
        data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      'Documents retrieved successfully',
    );
  }

  @Get('current/documents')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current client documents',
    description:
      'Retrieve all documents shared with the current logged-in client with pagination and search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
  })
  async getCurrentDocuments(
    @GetUserId() userId: string,
    @Query() filters: GetClientDocumentsDto,
  ) {
    const result = await this.documentService.getCurrentDocuments(
      userId,
      filters,
    );

    const data = plainToInstance(DocumentResponseDto, result.data, {
      excludeExtraneousValues: true,
    });

    return successResponse(
      {
        data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      'Documents retrieved successfully',
    );
  }

  @Post('share-to-client')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Share document to a client',
    description:
      'Share a document to a specific client with a share type (VIEW / SIGN).',
  })
  @ApiBody({ type: ShareToClientDto })
  @ApiResponse({
    status: 200,
    description: 'Document shared successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid client or request',
  })
  @ApiResponse({
    status: 403,
    description: 'Not permitted to share this document',
  })
  async shareToClient(
    @GetUserId() userId: string,
    @GetUser() user: any,
    @Body() dto: ShareToClientDto,
  ) {
    const document = await this.documentService.shareToClient(
      userId,
      user.role,
      dto,
    );

    const data = plainToInstance(DocumentResponseDto, document, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Document shared successfully');
  }

  @Patch('status-by-client')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update document status by client when hitting on view or sign button',
    description:
      'Update the status of a document as a client (e.g., mark as VIEWED or SIGNED).',
  })
  @ApiBody({ type: UpdateDocStatusByClientDto })
  @ApiResponse({
    status: 200,
    description: 'Document status updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found.',
  })
  @ApiResponse({
    status: 403,
    description: 'You do not have access to this document.',
  })
  async updateDocStatusByClient(
    @GetUserId() userId: string,
    @Body() dto: UpdateDocStatusByClientDto,
  ) {
    const document = await this.documentService.updateDocStatusByClient(
      userId,
      dto,
    );

    const data = plainToInstance(DocumentResponseDto, document, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Document status updated successfully');
  }

  @Get(':documentId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get document by ID',
    description:
      'Retrieve detailed information about a specific document, including all attached files and sharing settings.',
  })
  @ApiResponse({
    status: 200,
    description: 'Document details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      "We couldn't find this document. It may have been deleted or the ID is incorrect.",
  })
  @ApiResponse({
    status: 403,
    description:
      'You do not have permission to view this document. It has not been shared with you.',
  })
  async getDocumentById(
    @GetUserId() userId: string,
    @Param('documentId') documentId: string,
  ) {
    const document = await this.documentService.getDocumentById(
      userId,
      documentId,
    );
    const data = plainToInstance(DocumentResponseDto, document, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Document retrieved successfully');
  }

  @Patch(':documentId')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update document',
    description:
      'Update document details such as name, status, category, or sharing settings. You can only update documents that you uploaded.',
  })
  @ApiBody({ type: UpdateDocumentDto })
  @ApiResponse({
    status: 200,
    description: 'Your document has been updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: "We couldn't find this document. It may have been deleted.",
  })
  @ApiResponse({
    status: 403,
    description:
      'You can only update documents that you uploaded. This document belongs to another user.',
  })
  async updateDocument(
    @GetUserId() userId: string,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const document = await this.documentService.updateDocument(
      userId,
      documentId,
      dto,
      file,
    );
    const data = plainToInstance(DocumentResponseDto, document, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Your document has been updated successfully');
  }

  @Delete(':documentId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete document (soft delete)',
    description:
      'Move a document to trash. The document will be soft-deleted but can be restored later. You can only delete documents that you uploaded.',
  })
  @ApiResponse({
    status: 200,
    description: 'Your document has been moved to trash successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      "We couldn't find this document. It may have already been deleted.",
  })
  @ApiResponse({
    status: 403,
    description:
      'You can only delete documents that you uploaded. This document belongs to another user.',
  })
  async deleteDocument(
    @GetUserId() userId: string,
    @Param('documentId') documentId: string,
  ) {
    await this.documentService.deleteDocument(userId, documentId);
    return successResponse(
      null,
      'Your document has been moved to trash successfully',
    );
  }

  @Post('upload-signed/:documentId/:fileId/:oldFileUrl')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload signed document',
    description:
      'Upload a signed version of an existing document file. This will delete the specified file from S3 and database, upload the new signed file, mark the document as signed, and update the client status to SIGNED. Only the client can upload the signed version.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Signed document file',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponseTypeChecker({
    model: DocumentResponseDto,
    successStatus: 200,
    successMessage: 'Signed document uploaded successfully',
    successExampleData: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Invoice Q4 2025',
      folderId: '660e8400-e29b-41d4-a716-446655440001',
      uploadedBy: '770e8400-e29b-41d4-a716-446655440002',
      status: 'PENDING',
      shareToClient: true,
      clientShareTypes: 'SIGN',
      isSigned: true,
      statusByClient: 'SIGNED',
      documentCateory: 'CLIENT_INVOICE_IN',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  })
  @ApiResponse({ status: 400, description: 'No file uploaded' })
  @ApiResponse({ status: 404, description: 'Document or file not found' })
  @ApiResponse({
    status: 403,
    description: 'You do not have access to upload signed version',
  })
  async uploadSignedDocument(
    @GetUserId() userId: string,
    @Param('documentId') documentId: string,
    @Param('fileId') fileId: string,
    @Param('oldFileUrl') oldFileUrl: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const document = await this.documentService.uploadSignedDocument(
      userId,
      documentId,
      fileId,
      oldFileUrl,
      file,
    );

    const data = plainToInstance(DocumentResponseDto, document, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Signed document uploaded successfully');
  }
}
