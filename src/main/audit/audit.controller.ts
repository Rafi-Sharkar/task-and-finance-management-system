import { ApiResponseTypeChecker } from '@/common/swagger/response-typechecker.decorator';
import { successResponse } from '@/common/utils/response.util';
import {
  GetUserId,
  ValidateAdmin,
  ValidateEmployee,
  ValidateManager,
} from '@/core/jwt/jwt.decorator';
import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PaginatedAuditLogResponseDto } from './dto/audit-log-response.dto';
import { FilterAuditLogDto } from './dto/filter-audit-log.dto';
import { FilterMyAuditLogDto } from './dto/filter-my-audit-log.dto';

@ApiTags('Audit Logs')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('mylogs')
  @ValidateEmployee()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current user audit logs',
    description: 'Retrieve audit logs for the authenticated user',
  })
  @ApiResponseTypeChecker({
    model: PaginatedAuditLogResponseDto,
    successStatus: 200,
    successMessage: 'Audit logs retrieved successfully',
    successExampleData: {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          action: 'USER_LOGIN',
          createdAt: '2026-01-11T10:30:00.000Z',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            username: 'john.doe',
            email: 'john.doe@example.com',
            fullName: 'John Doe',
            role: 'EMPLOYEE',
          },
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174010',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          action: 'FOLDER_CREATED',
          createdAt: '2026-01-11T09:15:00.000Z',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            username: 'john.doe',
            email: 'john.doe@example.com',
            fullName: 'John Doe',
            role: 'EMPLOYEE',
          },
        },
      ],
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
    },
    errors: [
      { status: 401, message: 'Unauthorized - Invalid or missing token' },
      { status: 403, message: 'Forbidden - Insufficient permissions' },
    ],
  })
  async getMyLogs(
    @GetUserId() userId: string,
    @Query() filters: FilterMyAuditLogDto,
  ) {
    const result = await this.auditService.getMyLogs(userId, filters);
    return successResponse(result, 'Audit logs retrieved successfully');
  }

  @Get('managerlogs')
  @ValidateManager()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get manager audit logs',
    description:
      'Retrieve audit logs for manager (includes own logs + employee, client, and finance logs)',
  })
  @ApiResponseTypeChecker({
    model: PaginatedAuditLogResponseDto,
    successStatus: 200,
    successMessage: 'Manager audit logs retrieved successfully',
    successExampleData: {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          userId: '123e4567-e89b-12d3-a456-426614174003',
          action: 'FOLDER_CREATED',
          createdAt: '2026-01-11T11:15:00.000Z',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174003',
            username: 'jane.smith',
            email: 'jane.smith@example.com',
            fullName: 'Jane Smith',
            role: 'EMPLOYEE',
          },
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174012',
          userId: '123e4567-e89b-12d3-a456-426614174013',
          action: 'USER_LOGIN',
          createdAt: '2026-01-11T10:45:00.000Z',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174013',
            username: 'client.user',
            email: 'client@example.com',
            fullName: 'Client User',
            role: 'CLIENT',
          },
        },
      ],
      total: 150,
      page: 1,
      limit: 10,
      totalPages: 15,
    },
    errors: [
      { status: 401, message: 'Unauthorized - Invalid or missing token' },
      {
        status: 403,
        message: 'Forbidden - User is not a manager or account is not active',
      },
      { status: 404, message: 'User not found' },
    ],
  })
  async getManagerLogs(
    @GetUserId() userId: string,
    @Query() filters: FilterAuditLogDto,
  ) {
    const result = await this.auditService.getManagerLogs(userId, filters);
    return successResponse(result, 'Manager audit logs retrieved successfully');
  }

  @Get('adminlogs')
  @ValidateAdmin()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all audit logs (Admin only)',
    description:
      'Retrieve all audit logs from all users and roles (admin access required)',
  })
  @ApiResponseTypeChecker({
    model: PaginatedAuditLogResponseDto,
    successStatus: 200,
    successMessage: 'All audit logs retrieved successfully',
    successExampleData: {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174004',
          userId: '123e4567-e89b-12d3-a456-426614174005',
          action: 'USER_UPDATED',
          createdAt: '2026-01-11T12:00:00.000Z',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174005',
            username: 'admin.user',
            email: 'admin@example.com',
            fullName: 'Admin User',
            role: 'ADMIN',
          },
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174014',
          userId: '123e4567-e89b-12d3-a456-426614174015',
          action: 'PROJECT_CREATED',
          createdAt: '2026-01-11T11:30:00.000Z',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174015',
            username: 'manager.user',
            email: 'manager@example.com',
            fullName: 'Manager User',
            role: 'MANAGER',
          },
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174024',
          userId: '123e4567-e89b-12d3-a456-426614174025',
          action: 'TASK_DELETED',
          createdAt: '2026-01-11T10:00:00.000Z',
          user: {
            id: '123e4567-e89b-12d3-a456-426614174025',
            username: 'employee.user',
            email: 'employee@example.com',
            fullName: 'Employee User',
            role: 'EMPLOYEE',
          },
        },
      ],
      total: 500,
      page: 1,
      limit: 10,
      totalPages: 50,
    },
    errors: [
      { status: 401, message: 'Unauthorized - Invalid or missing token' },
      {
        status: 403,
        message:
          'Forbidden - User is not an admin, not active, or not verified',
      },
      { status: 404, message: 'User not found' },
    ],
  })
  async getAdminLogs(
    @GetUserId() userId: string,
    @Query() filters: FilterAuditLogDto,
  ) {
    const result = await this.auditService.getAdminLogs(userId, filters);
    return successResponse(result, 'All audit logs retrieved successfully');
  }
}
