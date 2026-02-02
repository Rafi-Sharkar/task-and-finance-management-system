import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiResourceService } from './ai-resource.service';

@ApiTags('AI Resources')
@Controller('ai-resource')
export class AiResourceController {
  constructor(private readonly aiResourceService: AiResourceService) {}

  @Get('user/:id')
  @ApiOperation({
    summary: 'Get all resources related to a specific user for AI teams',
    description: `
      Retrieves comprehensive user data including:
      - User profile information
      - Login history and sessions
      - Folders and documents
      - Projects (owned and as client)
      - Tasks (created, assigned, as client)
      - Invoices
      - Private conversations and messages
      - Notifications
      - Activity tracking
      - Audit logs
      - User settings
      
      This endpoint provides all user-related data across the system for AI analysis and processing.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID)',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'User resources retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            fullName: { type: 'string', example: 'John Doe' },
            username: { type: 'string', example: 'johndoe' },
            email: { type: 'string', example: 'john@example.com' },
            phone: { type: 'string', example: '+1234567890' },
            role: {
              type: 'string',
              enum: [
                'SUPER_ADMIN',
                'ADMIN',
                'MANAGER',
                'EMPLOYEE',
                'CLIENT',
                'FINANCE',
              ],
            },
            accountStatus: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'BLOCKED', 'RESTRICTED'],
            },
            isActive: { type: 'boolean' },
            lastActive: { type: 'string', format: 'date-time' },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        summary: {
          type: 'object',
        },
        resources: {
          type: 'object',
          properties: {
            loginHistory: { type: 'array', items: { type: 'object' } },
            folders: { type: 'array', items: { type: 'object' } },
            documents: { type: 'array', items: { type: 'object' } },
            projects: {
              type: 'object',
              properties: {
                owned: { type: 'array', items: { type: 'object' } },
                asClient: { type: 'array', items: { type: 'object' } },
              },
            },
            tasks: {
              type: 'object',
              properties: {
                created: { type: 'array', items: { type: 'object' } },
                asClient: { type: 'array', items: { type: 'object' } },
                assignedTo: { type: 'array', items: { type: 'object' } },
                assignedByUser: { type: 'array', items: { type: 'object' } },
              },
            },
            auditLogs: { type: 'array', items: { type: 'object' } },
            settings: { type: 'object', nullable: true },
            invoices: { type: 'array', items: { type: 'object' } },
            communications: {
              type: 'object',
              properties: {
                conversationsInitiated: {
                  type: 'array',
                  items: { type: 'object' },
                },
                conversationsReceived: {
                  type: 'array',
                  items: { type: 'object' },
                },
                messagesSent: { type: 'array', items: { type: 'object' } },
              },
            },
            notifications: { type: 'array', items: { type: 'object' } },
            activity: {
              type: 'object',
              properties: {
                sessions: { type: 'array', items: { type: 'object' } },
                dailyActivity: { type: 'array', items: { type: 'object' } },
              },
            },
            documentClients: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example:
            'User with ID 123e4567-e89b-12d3-a456-426614174000 not found',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example: 'Error fetching resources for user',
        },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async getUserResources(@Param('id') id: string) {
    return this.aiResourceService.getUserResources(id);
  }
}
