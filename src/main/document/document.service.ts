import { S3Service } from '@/lib/file/services/s3.service';
import { PrismaService } from '@/lib/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus, Prisma } from '@prisma';
import * as fs from 'fs';
import * as path from 'path';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_TYPES } from '../sm-notification/interface/event.name';
import { CreateDocumentDto } from './dto/create-document.dto';
import { FilterDocumentDto } from './dto/filter-document.dto';
import { FilterFolderDocumentsDto } from './dto/filter-folder-documents.dto';
import { GetClientDocumentsDto } from './dto/get-client-documents.dto';
import { ShareToClientDto } from './dto/share-to-client.dto';
import { UpdateDocStatusByClientDto } from './dto/update-doc-status-by-client.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    this.baseUrl =
      this.configService.get<string>('BASE_URL') || 'http://localhost:5000';

    // Ensure documents directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // ========================= COMMON INCLUDES =========================

  private readonly documentInclude = {
    files: {
      where: { isDeleted: false },
      select: {
        id: true,
        url: true,
        mimeType: true,
        sizeKB: true,
        extension: true,
        uploadedAt: true,
      },
    },
    client: {
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    },
    folder: {
      select: {
        id: true,
        name: true,
        createdBy: true,
      },
    },
    uploader: {
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        role: true,
      },
    },
  };

  // ========================= CREATE DOCUMENT =========================

  async createDocument(
    userId: string,
    userRole: string,
    dto: CreateDocumentDto,
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please upload at least one file.');
    }

    const folder = await this.prisma.client.folder.findUnique({
      where: { id: dto.folderId },
    });

    if (!folder || folder.isDeleted) {
      throw new NotFoundException('Folder not found.');
    }

    if (folder.createdBy !== userId) {
      throw new ForbiddenException('No access to this folder.');
    }

    const document = await this.prisma.client.document.create({
      data: {
        name: dto.name,
        folderId: dto.folderId,
        uploadedBy: userId,
        status: DocumentStatus.PENDING,
        clientId: dto.clientId || null,
        shareToClient: !!dto.clientId,
      },
    });

    for (const file of files) {
      const timestamp = Date.now();
      const uniqueKey = `${document.id}_${timestamp}`;
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const extension = safeName.split('.').pop() || '';
      const fileName = `${uniqueKey}.${extension}`;
      const filePath = path.join(this.uploadsDir, fileName);

      // Save file locally
      fs.writeFileSync(filePath, file.buffer);

      // Generate local URL
      const fileUrl = `${this.baseUrl}/uploads/documents/${fileName}`;

      // TODO: For future S3 implementation, uncomment below:

      await this.prisma.client.file.create({
        data: {
          documentId: document.id,
          url: fileUrl,
          mimeType: file.mimetype,
          sizeKB: Math.round(file.size / 1024),
          extension: extension,
        },
      });
    }

    // Return document with files
    const createdDocument = await this.prisma.client.document.findUnique({
      where: { id: document.id },
      include: this.documentInclude,
    });

    if (!createdDocument) {
      throw new NotFoundException('Failed to retrieve created document.');
    }

    // Get CURRENT WHO CREATED THE DOCUMENT notify the users
    const createdDocumentUser = await this.prisma.client.user.findMany({
      where: {
        isActive: true,
        isDeleted: false,
      },
      select: { id: true, email: true },
    });

    // Emit notification event
    this.eventEmitter.emit(EVENT_TYPES.DOCUMENT_APPROVAL, {
      action: 'CREATE',
      info: {
        id: createdDocument.id,
        documentname: ` the document ${createdDocument.name}`,
        documentCateory: folder.name,
        status: createdDocument.status,
        statusByClient: createdDocument.shareToClient ? 'SHARED' : 'PRIVATE',
        uploadedBy: userId,
        createdAt: createdDocument.createdAt,
        recipients: createdDocumentUser.map((user) => user.email),
      },
      meta: {
        documentId: createdDocument.id,
        name: createdDocument.name,
        publishedAt: createdDocument.createdAt,
      },
    });

    return createdDocument;
  }

  // ========================= GET SINGLE DOCUMENT =========================

  async getDocumentById(userId: string, documentId: string) {
    const document = await this.prisma.client.document.findUnique({
      where: { id: documentId },
      include: this.documentInclude,
    });

    if (!document || document.isDeleted) {
      throw new NotFoundException('Document not found.');
    }

    const hasAccess =
      document.uploadedBy === userId || document.clientId === userId;

    if (!hasAccess) {
      throw new ForbiddenException('Access denied.');
    }

    return document;
  }

  // ========================= GET DOCUMENTS BY FOLDER =========================

  async getDocumentsByFolder(
    userId: string,
    folderId: string,
    filters: FilterFolderDocumentsDto,
  ) {
    this.logger.warn('getDocumentsByFolder HIT ✅');

    const folder = await this.prisma.client.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.isDeleted)
      throw new NotFoundException('Folder not found.');
    if (folder.createdBy !== userId)
      throw new ForbiddenException('Access denied.');

    const { page = 1, limit = 10, documentName } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {
      folderId: folder.id,
      isDeleted: false,
      ...(documentName && {
        name: { contains: documentName, mode: 'insensitive' },
      }),
    };

    const [documents, total] = await Promise.all([
      this.prisma.client.document.findMany({
        where,
        skip,
        take: limit,
        include: this.documentInclude,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.document.count({ where }),
    ]);

    return {
      data: documents,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================= UPDATE DOCUMENT =========================

  async updateDocument(
    userId: string,
    documentId: string,
    dto: UpdateDocumentDto,
    file?: Express.Multer.File,
  ) {
    const document = await this.prisma.client.document.findUnique({
      where: { id: documentId },
      include: {
        files: {
          where: { isDeleted: false },
        },
      },
    });

    if (!document || document.isDeleted) {
      throw new NotFoundException('Document not found.');
    }

    if (document.uploadedBy !== userId) {
      throw new ForbiddenException('You can update only your documents.');
    }

    // Upload new file if provided and delete old files
    if (file) {
      // Delete all old files from local storage
      if (document.files && document.files.length > 0) {
        for (const oldFile of document.files) {
          try {
            const oldFileName = oldFile.url.split('/').pop();
            if (oldFileName) {
              const oldFilePath = path.join(this.uploadsDir, oldFileName);
              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                this.logger.log(
                  `Old file deleted from local storage: ${oldFilePath}`,
                );
              }
            }
            // TODO: For future S3 implementation, uncomment below:
            // await this.s3Service.deleteFile(oldFile.url);
          } catch (error) {
            this.logger.warn(
              `Failed to delete old file from local storage: ${oldFile.url}`,
              error,
            );
          }
        }

        // Mark old files as deleted in database
        await this.prisma.client.file.updateMany({
          where: {
            documentId: documentId,
            isDeleted: false,
          },
          data: {
            isDeleted: true,
          },
        });
      }

      // Upload new file
      const timestamp = Date.now();
      const uniqueKey = `${documentId}_${timestamp}`;
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const extension = safeName.split('.').pop() || '';
      const fileName = `${uniqueKey}.${extension}`;
      const filePath = path.join(this.uploadsDir, fileName);

      // Save file locally
      fs.writeFileSync(filePath, file.buffer);

      // Generate local URL
      const fileUrl = `${this.baseUrl}/uploads/documents/${fileName}`;

      // TODO: For future S3 implementation, uncomment below:
      // const s3Result = await this.s3Service.uploadFile(file, `documents/${documentId}/${timestamp}_${safeName}`);
      // const fileUrl = s3Result.url;

      await this.prisma.client.file.create({
        data: {
          documentId: documentId,
          url: fileUrl,
          mimeType: file.mimetype,
          sizeKB: Math.round(file.size / 1024),
          extension: extension,
        },
      });
    }

    const updated = await this.prisma.client.document.update({
      where: { id: documentId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.status && { status: dto.status }),
      },
      include: this.documentInclude,
    });

    // Send notifications based on status change
    if (dto.status && dto.status !== document.status) {
      const uploader = updated.uploader;
      const uploaderName = uploader?.fullName || uploader?.email || 'Unknown';
    }

    return updated;
  }

  // ========================= DELETE DOCUMENT =========================

  async deleteDocument(userId: string, documentId: string) {
    const document = await this.prisma.client.document.findUnique({
      where: { id: documentId },
      include: {
        files: true,
      },
    });

    if (!document || document.isDeleted) {
      throw new NotFoundException('Document not found.');
    }

    if (document.uploadedBy !== userId) {
      throw new ForbiddenException('Delete not allowed.');
    }

    // Delete all files from local storage
    if (document.files && document.files.length > 0) {
      for (const file of document.files) {
        try {
          const fileName = file.url.split('/').pop();
          if (fileName) {
            const filePath = path.join(this.uploadsDir, fileName);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              this.logger.log(`File deleted from local storage: ${filePath}`);
            }
          }
          // TODO: For future S3 implementation, uncomment below:
          // await this.s3Service.deleteFile(file.url);
        } catch (error) {
          this.logger.warn(
            `Failed to delete file from local storage: ${file.url}`,
            error,
          );
        }
      }
    }

    // Delete all file records from database
    await this.prisma.client.file.deleteMany({
      where: { documentId: documentId },
    });

    // Hard delete the document
    return this.prisma.client.document.delete({
      where: { id: documentId },
    });
  }

  // ========================= FILTERED DOCUMENT LIST =========================

  async getAllDocumentsWithFilters(
    currentUserId: string,
    currentUserRole: string,
    filters: FilterDocumentDto,
  ) {
    const {
      page = 1,
      limit = 10,
      documentName,
      status,
      type,
      startDate,
      endDate,
    } = filters;

    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {
      isDeleted: false,
      ...(documentName && {
        name: { contains: documentName, mode: 'insensitive' },
      }),
      ...(status && { status }),
      ...(type && { documentCateory: type }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };

    if (['EMPLOYEE', 'CLIENT', 'FINANCE'].includes(currentUserRole)) {
      where.OR = [{ uploadedBy: currentUserId }, { clientId: currentUserId }];
    }

    const [data, total] = await Promise.all([
      this.prisma.client.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.documentInclude,
      }),
      this.prisma.client.document.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================= GET CURRENT CLIENT DOCUMENTS =========================

  async getCurrentDocuments(clientId: string, filters: GetClientDocumentsDto) {
    const { page = 1, limit = 10, documentName } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {
      isDeleted: false,
      shareToClient: true,
      clientId: clientId,
      ...(documentName && {
        name: { contains: documentName, mode: 'insensitive' },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.client.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.documentInclude,
      }),
      this.prisma.client.document.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================= SHARE TO CLIENT =========================

  async shareToClient(userId: string, userRole: string, dto: ShareToClientDto) {
    const document = await this.prisma.client.document.findUnique({
      where: { id: dto.documentId },
    });

    if (!document || document.isDeleted) {
      throw new NotFoundException('Document not found.');
    }

    // Only uploader or admin/manager can share
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
    if (document.uploadedBy !== userId && !allowedRoles.includes(userRole)) {
      throw new ForbiddenException(
        'You do not have permission to share this document.',
      );
    }

    // Validate client exists and is of role CLIENT
    const client = await this.prisma.client.user.findUnique({
      where: { id: dto.clientId },
    });

    if (!client || client.role !== 'CLIENT') {
      throw new BadRequestException('Target user is not a valid client.');
    }

    // Update document: set shareToClient true, set clientId to this client and set clientShareTypes
    const updated = await this.prisma.client.document.update({
      where: { id: dto.documentId },
      data: {
        shareToClient: true,
        clientId: dto.clientId,
        clientShareTypes: dto.shareType,
      },
      include: this.documentInclude,
    });

    return updated;
  }

  // ========================= UPDATE DOCUMENT STATUS BY CLIENT =========================

  async updateDocStatusByClient(
    userId: string,
    dto: UpdateDocStatusByClientDto,
  ) {
    const document = await this.prisma.client.document.findUnique({
      where: { id: dto.docId },
    });

    if (!document || document.isDeleted) {
      throw new NotFoundException('Document not found.');
    }

    const hasAccess =
      document.clientId === userId || document.uploadedBy === userId;

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this document.');
    }

    const updated = await this.prisma.client.document.update({
      where: { id: dto.docId },
      data: { statusByClient: dto.statusByClient },
      include: this.documentInclude,
    });

    return updated;
  }

  // ========================= UPLOAD SIGNED DOCUMENT =========================

  async uploadSignedDocument(
    userId: string,
    documentId: string,
    fileId: string,
    oldFileUrl: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Please upload a signed document file.');
    }

    // Find the document
    const document = await this.prisma.client.document.findUnique({
      where: { id: documentId },
      include: {
        files: {
          where: { isDeleted: false },
        },
      },
    });

    const isAllowToSign = document?.clientShareTypes?.includes('SIGN');
    if (!isAllowToSign) {
      throw new ForbiddenException(
        'Signing not allowed for this document by client.',
      );
    }

    if (!document || document.isDeleted) {
      throw new NotFoundException('Document not found.');
    }

    // Check access - client or uploader can upload signed version
    const hasAccess = document.clientId === userId;

    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this document.');
    }

    // Find the specific file to replace
    const existingFile = await this.prisma.client.file.findUnique({
      where: { id: fileId },
    });

    if (!existingFile || existingFile.documentId !== documentId) {
      throw new NotFoundException(
        'File not found or does not belong to this document.',
      );
    }

    // Delete old file from local storage
    try {
      const oldFileName = existingFile.url.split('/').pop();
      if (oldFileName) {
        const oldFilePath = path.join(this.uploadsDir, oldFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          this.logger.log(`File deleted from local storage: ${oldFilePath}`);
        }
      }
      // TODO: For future S3 implementation, uncomment below:
      // if (!existingFile.url.includes(oldFileUrl)) {
      //   await this.s3Service.deleteFile(existingFile.url);
      //   this.logger.log(`File deleted from S3: ${existingFile.url}`);
      // }
    } catch (error) {
      this.logger.warn(
        `Failed to delete file from local storage: ${existingFile.url}`,
        error,
      );
      // Continue even if deletion fails
    }

    // Delete the file record from database
    await this.prisma.client.file.delete({
      where: { id: fileId },
    });

    // Save new signed file locally
    const timestamp = Date.now();
    const uniqueKey = `${documentId}_${timestamp}_signed`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const extension = safeName.split('.').pop() || '';
    const fileName = `${uniqueKey}.${extension}`;
    const filePath = path.join(this.uploadsDir, fileName);

    // Save file locally
    fs.writeFileSync(filePath, file.buffer);

    // Generate local URL
    const fileUrl = `${this.baseUrl}/uploads/documents/${fileName}`;

    // TODO: For future S3 implementation, uncomment below:
    // const folder = `documents/${documentId}`;
    // const filename = `${timestamp}_signed_${safeName}`;
    // const fileUrl = await this.s3Service.uploadFile(file, folder, filename);

    // Create new file record
    await this.prisma.client.file.create({
      data: {
        documentId: documentId,
        url: fileUrl,
        mimeType: file.mimetype,
        sizeKB: Math.round(file.size / 1024),
        extension: safeName.split('.').pop() || '',
      },
    });

    // Update document: mark as signed and update client status
    const updatedDocument = await this.prisma.client.document.update({
      where: { id: documentId },
      data: {
        isSigned: true,
        statusByClient: 'SIGNED',
      },
      include: this.documentInclude,
    });

    // Notify finance and document uploader about document signing
    const client = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true },
    });

    return updatedDocument;
  }

  // ========================= HELPERS =========================
}
