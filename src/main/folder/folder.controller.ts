import { ApiResponseTypeChecker } from '@/common/swagger/response-typechecker.decorator';
import { successResponse } from '@/common/utils/response.util';
import { GetUserId, ValidateEmployee } from '@/core/jwt/jwt.decorator';
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CreateFolderDto } from './dto/create-folder.dto';
import { FolderResponseDto } from './dto/folder-response.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderService } from './folder.service';

@ApiTags('Folders')
@Controller('folders')
@ValidateEmployee()
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new folder',
    description:
      'Create a new folder to organize your documents. You can create it at the root level or inside an existing folder by specifying a parent folder ID.',
  })
  @ApiBody({ type: CreateFolderDto })
  @ApiResponseTypeChecker({
    model: FolderResponseDto,
    successStatus: 201,
    successMessage: 'Folder created successfully',
    successExampleData: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Project Documents',
      parentId: null,
      createdBy: '770e8400-e29b-41d4-a716-446655440002',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      breadcrumb: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Project Documents',
        },
      ],
      children: [
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          name: 'Invoices',
          parentId: '550e8400-e29b-41d4-a716-446655440000',
          createdBy: '770e8400-e29b-41d4-a716-446655440002',
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      documents: [
        {
          id: '880e8400-e29b-41d4-a716-446655440003',
          name: 'Contract 2025.pdf',
          files: [
            {
              id: '990e8400-e29b-41d4-a716-446655440004',
              url: 'https://placeholder-storage.example.com/documents/880e8400-e29b-41d4-a716-446655440003/1704764400000_contract.pdf',
              mimeType: 'application/pdf',
              sizeKB: 512,
              extension: 'pdf',
              uploadedAt: new Date().toISOString(),
            },
          ],
        },
      ],
    },
    errors: [
      {
        status: 400,
        message:
          "The parent folder you specified couldn't be found or you don't have access to it.",
      },
      { status: 401, message: 'You must be logged in to create folders.' },
      {
        status: 500,
        message:
          'Something went wrong while creating the folder. Please try again.',
      },
    ],
  })
  async createFolder(
    @GetUserId() userId: string,
    @Body() dto: CreateFolderDto,
  ) {
    const folder = await this.folderService.createFolder(userId, dto);
    const data = plainToInstance(FolderResponseDto, folder, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Your folder has been created successfully');
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user folders',
    description:
      'Retrieve all your folders. This returns all folders you have created, organized by hierarchy.',
  })
  @ApiResponseTypeChecker({
    model: FolderResponseDto,
    successStatus: 200,
    successMessage: 'Your folders have been retrieved successfully',
    successExampleData: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Project Documents',
        parentId: null,
        createdBy: '770e8400-e29b-41d4-a716-446655440002',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        name: 'Financial Records',
        parentId: null,
        createdBy: '770e8400-e29b-41d4-a716-446655440002',
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    errors: [
      {
        status: 401,
        message: 'You must be logged in to retrieve folders.',
      },
      {
        status: 500,
        message:
          'Something went wrong while retrieving your folders. Please try again.',
      },
    ],
  })
  async getUserFolders(@GetUserId() userId: string) {
    const folders = await this.folderService.getFoldersByUserId(userId);
    const data = plainToInstance(FolderResponseDto, folders, {
      excludeExtraneousValues: true,
    });

    return successResponse(
      data,
      'Your folders have been retrieved successfully',
    );
  }

  @Get('trash')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get trash folders',
    description:
      'View all folders that have been deleted. These folders can be restored or permanently deleted.',
  })
  @ApiResponseTypeChecker({
    model: FolderResponseDto,
    successStatus: 200,
    successMessage: 'Your deleted folders have been retrieved successfully',
    successExampleData: [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Old Archive',
        parentId: null,
        createdBy: '770e8400-e29b-41d4-a716-446655440002',
        isDeleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    errors: [
      {
        status: 401,
        message: 'You must be logged in to access trash.',
      },
      {
        status: 500,
        message:
          'Something went wrong while retrieving trash. Please try again.',
      },
    ],
  })
  async getTrashFolders(@GetUserId() userId: string) {
    const folders = await this.folderService.getTrashFolders(userId);
    const data = plainToInstance(FolderResponseDto, folders, {
      excludeExtraneousValues: true,
    });

    return successResponse(
      data,
      'Your deleted folders have been retrieved successfully',
    );
  }

  @Get(':folderId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all child folders by parent folder ID',
    description:
      'Retrieve all subfolders (child folders) that belong to the specified parent folder ID. Returns the list of all folders where parentId equals the given folderId.',
  })
  @ApiResponseTypeChecker({
    model: FolderResponseDto,
    successStatus: 200,
    successMessage: 'Child folders retrieved successfully',
    successExampleData: {
      parentFolderId: '550e8400-e29b-41d4-a716-446655440000',
      parentFolderName: 'Project Documents',
      childFolders: [
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          name: 'Q1 Reports',
          parentId: '550e8400-e29b-41d4-a716-446655440000',
          createdBy: '770e8400-e29b-41d4-a716-446655440002',
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440003',
          name: 'Q2 Reports',
          parentId: '550e8400-e29b-41d4-a716-446655440000',
          createdBy: '770e8400-e29b-41d4-a716-446655440002',
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      totalChildren: 2,
    },
    errors: [
      {
        status: 404,
        message:
          "We couldn't find this folder. It may have been deleted or the ID is incorrect.",
      },
      {
        status: 403,
        message: 'You do not have access to this folder.',
      },
      {
        status: 401,
        message: 'You must be logged in to access folders.',
      },
      {
        status: 500,
        message:
          'Something went wrong while retrieving child folders. Please try again.',
      },
    ],
  })
  async getFolderById(
    @GetUserId() userId: string,
    @Param('folderId') folderId: string,
  ) {
    const folder = await this.folderService.getFolderById(userId, folderId);
    return successResponse(folder, 'Child folders retrieved successfully');
  }

  @Patch(':folderId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Rename folder',
    description:
      'Rename a folder. You can only rename folders that you created. Provide the new name for the folder.',
  })
  @ApiBody({ type: UpdateFolderDto })
  @ApiResponseTypeChecker({
    model: FolderResponseDto,
    successStatus: 200,
    successMessage: 'Your folder has been renamed successfully',
    successExampleData: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Updated Folder Name',
      parentId: null,
      createdBy: '770e8400-e29b-41d4-a716-446655440002',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      children: [],
      documents: [],
    },
    errors: [
      {
        status: 404,
        message: "We couldn't find this folder. It may have been deleted.",
      },
      {
        status: 403,
        message: 'You do not have permission to rename this folder.',
      },
      {
        status: 400,
        message: 'Folder name is required and cannot be empty.',
      },
      {
        status: 401,
        message: 'You must be logged in to rename folders.',
      },
      {
        status: 500,
        message:
          'Something went wrong while renaming the folder. Please try again.',
      },
    ],
  })
  async updateFolder(
    @GetUserId() userId: string,
    @Param('folderId') folderId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    const folder = await this.folderService.updateFolder(userId, folderId, dto);
    const data = plainToInstance(FolderResponseDto, folder, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Your folder has been renamed successfully');
  }

  // @Delete(':folderId')
  // @ApiBearerAuth()
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({
  //   summary: 'Delete folder (soft delete)',
  //   description:
  //     'Move a folder to trash. The folder must be empty (no documents or subfolders inside). You can only delete folders that you created.',
  // })
  // @ApiResponseTypeChecker({
  //   model: FolderResponseDto,
  //   successStatus: 200,
  //   successMessage: 'Your folder has been moved to trash successfully',
  //   successExampleData: null,
  //   errors: [
  //     {
  //       status: 404,
  //       message:
  //         "We couldn't find this folder. It may have already been deleted.",
  //     },
  //     {
  //       status: 400,
  //       message:
  //         'This folder cannot be deleted because it contains subfolders or documents. Please delete or move them first.',
  //     },
  //     {
  //       status: 403,
  //       message: 'You do not have permission to delete this folder.',
  //     },
  //     {
  //       status: 401,
  //       message: 'You must be logged in to delete folders.',
  //     },
  //     {
  //       status: 500,
  //       message:
  //         'Something went wrong while deleting the folder. Please try again.',
  //     },
  //   ],
  // })
  // async deleteFolder(
  //   @GetUserId() userId: string,
  //   @Param('folderId') folderId: string,
  // ) {
  //   await this.folderService.deleteFolder(userId, folderId);
  //   return successResponse(
  //     null,
  //     'Your folder has been moved to trash successfully',
  //   );
  // }

  @Delete(':folderId/permanent')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Permanently delete folder',
    description:
      'Permanently delete a folder and all its contents (documents and subfolders). This action cannot be undone. Use with caution!',
  })
  @ApiResponseTypeChecker({
    model: FolderResponseDto,
    successStatus: 200,
    successMessage:
      'Your folder and all its contents have been permanently deleted',
    successExampleData: null,
    errors: [
      {
        status: 404,
        message: "We couldn't find this folder.",
      },
      {
        status: 403,
        message:
          'You do not have permission to permanently delete this folder.',
      },
      {
        status: 401,
        message: 'You must be logged in to delete folders.',
      },
      {
        status: 500,
        message:
          'Something went wrong while permanently deleting the folder. Please try again.',
      },
    ],
  })
  async permanentlyDeleteFolder(
    @GetUserId() userId: string,
    @Param('folderId') folderId: string,
  ) {
    await this.folderService.permanentlyDeleteFolder(userId, folderId);
    return successResponse(
      null,
      'Your folder and all its contents have been permanently deleted',
    );
  }
}
