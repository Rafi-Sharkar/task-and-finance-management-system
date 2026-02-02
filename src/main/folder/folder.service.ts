import { PrismaService } from '@/lib/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Injectable()
export class FolderService {
  private readonly logger = new Logger(FolderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new folder
   */
  async createFolder(userId: string, dto: CreateFolderDto) {
    try {
      this.logger.log(`Creating folder "${dto.name}" for user ${userId}`);

      // If parentId is provided, verify it exists and user has access
      if (dto.parentId) {
        const parentFolder = await this.prisma.client.folder.findUnique({
          where: { id: dto.parentId },
        });

        if (!parentFolder) {
          throw new NotFoundException(
            "We couldn't find the parent folder you specified. Please verify the folder ID.",
          );
        }

        if (parentFolder.isDeleted) {
          throw new BadRequestException(
            'The parent folder you selected has been deleted. Please choose a different folder or restore it first.',
          );
        }

        if (parentFolder.createdBy !== userId) {
          throw new ForbiddenException(
            'You do not have access to this parent folder. Please select a folder you created.',
          );
        }
      }

      const folder = await this.prisma.client.folder.create({
        data: {
          name: dto.name,
          parentId: dto.parentId,
          createdBy: userId,
        },
        include: {
          documents: {
            where: { isDeleted: false },
            select: {
              id: true,
              name: true,
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
            },
          },
          children: {
            where: { isDeleted: false },
          },
        },
      });

      this.logger.debug(`Folder created successfully: ${folder.id}`);

      // Create audit log for folder creation
      await this.auditService.createLog({
        userId,
        action: 'FOLDER_CREATED',
      });

      return folder;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get folder by ID
   */
  async getFolderById(userId: string, folderId: string) {
    try {
      this.logger.log(
        `Fetching all child folders for folder ${folderId} by user ${userId}`,
      );

      // First verify that the parent folder exists and user has access
      const parentFolder = await this.prisma.client.folder.findUnique({
        where: { id: folderId },
      });

      if (!parentFolder) {
        throw new NotFoundException(
          "We couldn't find the folder you're looking for. It may have been deleted or the ID is incorrect.",
        );
      }

      if (parentFolder.isDeleted) {
        throw new NotFoundException(
          'This folder has been deleted and is no longer available.',
        );
      }

      if (parentFolder.createdBy !== userId) {
        throw new ForbiddenException(
          'You do not have access to this folder. Please verify the folder ID.',
        );
      }

      // Fetch all child folders where parentId equals the given folderId
      const childFolders = await this.prisma.client.folder.findMany({
        where: {
          parentId: folderId,
          isDeleted: false,
        },
        include: {
          creator: {
            select: { id: true, fullName: true, email: true },
          },
          // children: {
          //   where: { isDeleted: false },
          // },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        parentFolderId: folderId,
        parentFolderName: parentFolder.name,
        childFolders: childFolders,
        totalChildren: childFolders.length,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all folders for a user
   */
  async getFoldersByUserId(userId: string, parentId?: string) {
    try {
      this.logger.log(`Fetching folders for user ${userId}`);

      const folders = await this.prisma.client.folder.findMany({
        where: {
          createdBy: userId,
          isDeleted: false,
          ...(parentId && { parentId }),
          ...(!parentId && { parentId: null }),
        },
        include: {
          documents: {
            where: { isDeleted: false },
            select: {
              id: true,
              name: true,
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
            },
          },
          children: {
            where: { isDeleted: false },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Add breadcrumb for each folder
      const foldersWithBreadcrumb = await Promise.all(
        folders.map(async (folder) => ({
          ...folder,
          breadcrumb: await this.buildBreadcrumb(folder.id),
        })),
      );

      return foldersWithBreadcrumb;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all folders for a user with hierarchy
   */
  async getAllFoldersHierarchy(userId: string) {
    try {
      this.logger.log(`Fetching folder hierarchy for user ${userId}`);

      const folders = await this.prisma.client.folder.findMany({
        where: {
          createdBy: userId,
          isDeleted: false,
        },
        include: {
          documents: {
            where: { isDeleted: false },
            select: {
              id: true,
              name: true,
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
            },
          },
          children: {
            where: { isDeleted: false },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Build hierarchy
      const rootFolders = folders.filter((f) => !f.parentId);
      return this.buildHierarchy(rootFolders, folders);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get trash folders (soft deleted)
   */
  async getTrashFolders(userId: string) {
    try {
      this.logger.log(`Fetching trash folders for user ${userId}`);

      const folders = await this.prisma.client.folder.findMany({
        where: {
          createdBy: userId,
          isDeleted: true,
        },
        include: {
          documents: {
            select: {
              id: true,
              name: true,
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
            },
          },
          children: {
            where: { isDeleted: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Add breadcrumb for each folder
      const foldersWithBreadcrumb = await Promise.all(
        folders.map(async (folder) => ({
          ...folder,
          breadcrumb: await this.buildBreadcrumb(folder.id),
        })),
      );

      return foldersWithBreadcrumb;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update folder
   */
  async updateFolder(userId: string, folderId: string, dto: UpdateFolderDto) {
    try {
      this.logger.log(`Renaming folder ${folderId} for user ${userId}`);

      const folder = await this.prisma.client.folder.findUnique({
        where: { id: folderId },
      });

      if (!folder) {
        throw new NotFoundException(
          "We couldn't find the folder you're trying to update. It may have been deleted.",
        );
      }

      if (folder.isDeleted) {
        throw new NotFoundException(
          'This folder has been deleted and cannot be updated.',
        );
      }

      if (folder.createdBy !== userId) {
        throw new ForbiddenException(
          'You can only update folders that you created. This folder belongs to another user.',
        );
      }

      // Update only the folder name
      const updatedFolder = await this.prisma.client.folder.update({
        where: { id: folderId },
        data: {
          name: dto.name,
          updatedAt: new Date(),
        },
        include: {
          documents: {
            where: { isDeleted: false },
            select: {
              id: true,
              name: true,
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
            },
          },
          children: {
            where: { isDeleted: false },
          },
        },
      });

      this.logger.debug(`Folder renamed successfully: ${folderId}`);

      // Create audit log for folder update
      await this.auditService.createLog({
        userId,
        action: 'FOLDER_RENAMED',
      });

      return updatedFolder;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete folder (soft delete)
   */
  // async deleteFolder(userId: string, folderId: string) {
  //   try {
  //     this.logger.log(`Deleting folder ${folderId} for user ${userId}`);

  //     const folder = await this.prisma.client.folder.findUnique({
  //       where: { id: folderId },
  //     });

  //     if (!folder) {
  //       throw new NotFoundException(
  //         "We couldn't find the folder you're trying to delete. It may have already been removed.",
  //       );
  //     }

  //     if (folder.isDeleted) {
  //       throw new NotFoundException('This folder has already been deleted.');
  //     }

  //     if (folder.createdBy !== userId) {
  //       throw new ForbiddenException(
  //         'You can only delete folders that you created. This folder belongs to another user.',
  //       );
  //     }

  //     // Check for child folders and documents
  //     const childCount = await this.prisma.client.folder.count({
  //       where: {
  //         parentId: folderId,
  //         isDeleted: false,
  //       },
  //     });

  //     const documentCount = await this.prisma.client.document.count({
  //       where: {
  //         folderId: folderId,
  //         isDeleted: false,
  //       },
  //     });

  //     if (childCount > 0 || documentCount > 0) {
  //       throw new BadRequestException(
  //         'This folder cannot be deleted because it contains subfolders or documents. Please delete or move them first.',
  //       );
  //     }

  //     const deletedFolder = await this.prisma.client.folder.update({
  //       where: { id: folderId },
  //       data: { isDeleted: true },
  //     });

  //     this.logger.debug(`Folder soft-deleted successfully: ${folderId}`);

  //     // Create audit log for folder deletion
  //     await this.auditService.createLog({
  //       userId,
  //       action: 'FOLDER_DELETED',
  //     });

  //     return deletedFolder;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  /**
   * Permanently delete folder
   */
  async permanentlyDeleteFolder(userId: string, folderId: string) {
    try {
      this.logger.log(
        `Permanently deleting folder ${folderId} for user ${userId}`,
      );

      const folder = await this.prisma.client.folder.findUnique({
        where: { id: folderId },
      });

      if (!folder) {
        throw new NotFoundException(
          "We couldn't find the folder you're trying to permanently delete.",
        );
      }

      if (folder.createdBy !== userId) {
        throw new ForbiddenException(
          'You can only delete folders that you created. This folder belongs to another user.',
        );
      }

      // Delete all documents in folder
      await this.prisma.client.document.deleteMany({
        where: { folderId: folderId },
      });

      // Delete all child folders recursively
      await this.prisma.client.folder.deleteMany({
        where: { parentId: folderId },
      });

      // for (const childFolder of childFolders) {
      //   await this.permanentlyDeleteFolder(userId, childFolder.id);
      // }

      await this.prisma.client.folder.delete({
        where: { id: folderId },
      });

      this.logger.debug(`Folder permanently deleted successfully: ${folderId}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check for circular reference when moving folder
   */
  private async hasCircularReference(
    folderId: string,
    parentId: string,
  ): Promise<boolean> {
    if (folderId === parentId) {
      return true;
    }

    const parent = await this.prisma.client.folder.findUnique({
      where: { id: parentId },
    });

    if (!parent || !parent.parentId) {
      return false;
    }

    return this.hasCircularReference(folderId, parent.parentId);
  }

  /**
   * Build folder hierarchy
   */
  private buildHierarchy(folders: any[], allFolders: any[]): any[] {
    return folders.map((folder) => ({
      ...folder,
      children: allFolders
        .filter((f) => f.parentId === folder.id)
        .map((f) => ({
          ...f,
          children: this.buildHierarchy([f], allFolders),
        })),
    }));
  }

  /**
   * Build breadcrumb path from folder to root
   * Returns array of parent folders from current folder to root
   */
  private async buildBreadcrumb(
    folderId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const breadcrumb: Array<{ id: string; name: string }> = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folderData: {
        id: string;
        name: string;
        parentId: string | null;
      } | null = await this.prisma.client.folder.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });

      if (!folderData) {
        break;
      }

      breadcrumb.unshift({ id: folderData.id, name: folderData.name });
      currentId = folderData.parentId;
    }

    return breadcrumb;
  }
}
