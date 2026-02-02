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
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CreateTaskDto } from './dto/create-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskService } from './task.service';

@ApiTags('Tasks')
@Controller('tasks')
@ValidateEmployee()
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new task',
    description:
      'Create a new task and optionally assign it to one or more employees. You can set priority, deadline, and link it to a project or client.',
  })
  @ApiBody({ type: CreateTaskDto })
  @ApiResponseTypeChecker({
    model: TaskResponseDto,
    successStatus: 201,
    successMessage: 'Task created successfully',
    successExampleData: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Complete Project Documentation',
      createdBy: '880e8400-e29b-41d4-a716-446655440003',
      deadline: new Date('2026-12-31T23:59:59.000Z').toISOString(),
      priority: 'HIGH',
      note: 'Focus on API documentation first',
      status: 'IN_PROGRESS',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      creator: {
        id: '880e8400-e29b-41d4-a716-446655440003',
        fullName: 'Manager Smith',
        email: 'manager.smith@example.com',
      },
      assignments: [
        {
          id: '990e8400-e29b-41d4-a716-446655440004',
          employeeId: 'aa0e8400-e29b-41d4-a716-446655440005',
          assignedBy: '880e8400-e29b-41d4-a716-446655440003',
          status: 'IN_PROGRESS',
          completedAt: null,
          assignedAt: new Date().toISOString(),
          employee: {
            id: 'aa0e8400-e29b-41d4-a716-446655440005',
            fullName: 'Employee Jane',
            email: 'employee.jane@example.com',
          },
        },
      ],
    },
    errors: [
      {
        status: 400,
        message:
          'Invalid data provided. Please check your input and try again.',
      },
      {
        status: 404,
        message:
          "The project or client you specified couldn't be found. Please verify the IDs.",
      },
      { status: 401, message: 'You must be logged in to create tasks.' },
      {
        status: 500,
        message:
          'Something went wrong while creating the task. Please try again.',
      },
    ],
  })
  async createTask(@GetUserId() userId: string, @Body() dto: CreateTaskDto) {
    const task = await this.taskService.createTask(userId, dto);
    const data = plainToInstance(TaskResponseDto, task, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Your task has been created successfully');
  }

  //   @Get()
  //   @ApiBearerAuth()
  //   @ApiOperation({
  //     summary: 'Get all tasks with filters',
  //     description:
  //       'Get all tasks with optional filters for manager ID, priority, status, deadline, and title.',
  //   })
  //   @ApiQuery({ name: 'managerId', required: false, type: String })
  //   @ApiQuery({
  //     name: 'priority',
  //     required: false,
  //     enum: ['HIGH', 'LOW', 'MEDIUM'],
  //   })
  //   @ApiQuery({
  //     name: 'status',
  //     required: false,
  //     enum: ['IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED'],
  //   })
  //   @ApiQuery({ name: 'deadline', required: false, type: String })
  //   @ApiQuery({ name: 'title', required: false, type: String })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'Tasks retrieved successfully',
  //   })
  //   async getAllTasks(
  //     @GetUserId() userId: string,
  //     @Query() filters: FilterTaskDto,
  //   ) {
  //     const tasks = await this.taskService.getAllTasks(userId, filters);
  //     const data = plainToInstance(TaskResponseDto, tasks, {
  //       excludeExtraneousValues: true,
  //     });

  //     return successResponse(data, 'Tasks retrieved successfully');
  //   }

  @Get('my-tasks')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my tasks (Manager/Admin only)',
    description:
      'Get all tasks created by the current logged-in user. This route is only accessible for MANAGER or ADMIN roles. The user ID is automatically retrieved from the authentication token.',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['HIGH', 'LOW', 'MEDIUM'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED'],
  })
  @ApiQuery({ name: 'deadline', required: false, type: String })
  @ApiQuery({ name: 'title', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Your tasks have been retrieved successfully',
  })
  async getMyTasks(
    @GetUserId() userId: string,
    @Query() filters: FilterTaskDto,
  ) {
    const tasks = await this.taskService.getTasksByManagerId(userId, filters);
    const data = plainToInstance(TaskResponseDto, tasks, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Your tasks have been retrieved successfully');
  }

  @Get('task-dashboard/my-tasks')
  async getMyTaskDashboardSummary(@GetUserId() userId: string) {
    return await this.taskService.getMyRecentTask(userId);
  }

  @Get('assigned-to-me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get tasks assigned to me',
    description:
      'Get all tasks that have been assigned to you. You can filter by priority, status, deadline, or title. This is available for all users.',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['HIGH', 'LOW', 'MEDIUM'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED'],
  })
  @ApiQuery({ name: 'deadline', required: false, type: String })
  @ApiQuery({ name: 'title', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Your assigned tasks have been retrieved successfully',
  })
  async getMyAssignedTasks(
    @GetUserId() userId: string,
    @Query() filters: FilterTaskDto,
  ) {
    const tasks = await this.taskService.getMyAssignedTasks(userId, filters);
    const data = plainToInstance(TaskResponseDto, tasks, {
      excludeExtraneousValues: true,
    });

    return successResponse(
      data,
      'Your assigned tasks have been retrieved successfully',
    );
  }

  /**
   * Get Task by ID Endpoint
   *
   * This endpoint retrieves detailed information about a specific task by its ID.
   *
   * @route GET /tasks/:taskId
   * @access Private (requires authentication via JWT bearer token)
   *
   * @param {string} taskId - The unique identifier (UUID) of the task to retrieve
   * @param {string} userId - Automatically extracted from the JWT token of the authenticated user
   *
   * @returns {Object} Success response containing:
   *   - id: Task unique identifier
   *   - title: Task title
   *   - createdBy: ID of the user who created the task
   *   - deadline: Optional task deadline
   *   - priority: Task priority level (HIGH, MEDIUM, LOW)
   *   - note: Optional task notes
   *   - status: Current task status (IN_PROGRESS, COMPLETED, NOT_COMPLETED)
   *   - isDeleted: Boolean indicating if task is soft-deleted
   *   - createdAt: Task creation timestamp
   *   - updatedAt: Last update timestamp
   *   - creator: Creator user details (id, fullName, email)
   *   - assignments: Array of task assignments with:
   *     - assignmentId: Task assignment unique identifier
   *     - employeeId: Assigned employee ID
   *     - assignedBy: User who made the assignment
   *     - assignmentStatus: Assignment status (IN_PROGRESS, COMPLETED, NOT_COMPLETED)
   *     - completedAt: When the assignment was completed
   *     - assignedAt: When the assignment was made
   *     - employee: Employee details (id, fullName, email)
   *
   * @throws {NotFoundException} If task is not found or has been deleted
   * @throws {BadRequestException} If taskId format is invalid
   * @throws {UnauthorizedException} If user is not authenticated
   *
   * @example
   * GET /tasks/550e8400-e29b-41d4-a716-446655440000
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "id": "550e8400-e29b-41d4-a716-446655440000",
   *     "title": "Complete Project Documentation",
   *     "createdBy": "880e8400-e29b-41d4-a716-446655440003",
   *     "deadline": "2026-12-31T23:59:59.000Z",
   *     "priority": "HIGH",
   *     "note": "Focus on API documentation first",
   *     "status": "IN_PROGRESS",
   *     "isDeleted": false,
   *     "createdAt": "2026-01-22T10:30:00.000Z",
   *     "updatedAt": "2026-01-22T15:45:30.000Z",
   *     "creator": {
   *       "id": "880e8400-e29b-41d4-a716-446655440003",
   *       "fullName": "Manager Smith",
   *       "email": "manager.smith@example.com"
   *     },
   *     "assignments": [
   *       {
   *         "assignmentId": "990e8400-e29b-41d4-a716-446655440004",
   *         "employeeId": "aa0e8400-e29b-41d4-a716-446655440005",
   *         "assignedBy": "880e8400-e29b-41d4-a716-446655440003",
   *         "assignmentStatus": "IN_PROGRESS",
   *         "completedAt": null,
   *         "assignedAt": "2026-01-22T10:35:00.000Z",
   *         "employee": {
   *           "id": "aa0e8400-e29b-41d4-a716-446655440005",
   *           "fullName": "Employee Jane",
   *           "email": "employee.jane@example.com"
   *         }
   *       }
   *     ]
   *   },
   *   "message": "Task details retrieved successfully"
   * }
   */
  // @Get(':taskId')
  // @ApiBearerAuth()
  // @ApiOperation({
  //   summary: 'Get task by ID',
  //   description:
  //     'Retrieve detailed information about a specific task, including all assignments and related project/client data.',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Task details retrieved successfully',
  // })
  // @ApiResponse({
  //   status: 404,
  //   description:
  //     "We couldn't find this task. It may have been deleted or the ID is incorrect.",
  // })
  // async getTaskById(
  //   @GetUserId() userId: string,
  //   @Param('taskId') taskId: string,
  // ) {
  //   // Fetch the task with all related information
  //   const task = await this.taskService.getTaskById(userId, taskId);

  //   // Transform the task data to TaskResponseDto format
  //   // This ensures only exposed fields are returned to the client
  //   const data = plainToInstance(TaskResponseDto, task, {
  //     excludeExtraneousValues: true,
  //   });

  //   // Return the task details with success message
  //   return successResponse(data, 'Task details retrieved successfully');
  // }
  @Patch(':taskId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update task',
    description:
      'Update task details such as title, description, priority, status, or assignments. You can only update tasks that you created.',
  })
  @ApiBody({ type: UpdateTaskDto })
  @ApiResponse({
    status: 200,
    description: 'Your task has been updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: "We couldn't find this task. It may have been deleted.",
  })
  @ApiResponse({
    status: 403,
    description:
      'You can only update tasks that you created. This task belongs to another user.',
  })
  async updateTask(
    @GetUserId() userId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.taskService.updateTask(userId, taskId, dto);
    const data = plainToInstance(TaskResponseDto, task, {
      excludeExtraneousValues: true,
    });

    return successResponse(data, 'Your task has been updated successfully');
  }

  @Patch('assignment/:assignmentId/status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update task assignment status',
    description:
      'Update the status of your task assignment (e.g., mark as in progress or completed). You can only update assignments that are assigned to you.',
  })
  @ApiBody({ type: UpdateAssignmentStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Your assignment status has been updated successfully',
  })
  @ApiResponse({
    status: 403,
    description:
      'You can only update your own task assignments. This assignment belongs to another employee.',
  })
  @ApiResponse({
    status: 404,
    description: "We couldn't find this assignment. It may have been removed.",
  })
  async updateAssignmentStatus(
    @GetUserId() userId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentStatusDto,
  ) {
    const assignment = await this.taskService.updateAssignmentStatus(
      userId,
      assignmentId,
      dto,
    );
    return successResponse(
      assignment,
      'Your assignment status has been updated successfully',
    );
  }

  @Delete(':taskId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete task (soft delete)',
    description:
      'Soft delete a task. The task will be moved to trash but not permanently removed. You can only delete tasks that you created.',
  })
  @ApiResponse({
    status: 200,
    description: 'Your task has been deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      "We couldn't find this task. It may have already been deleted.",
  })
  @ApiResponse({
    status: 403,
    description:
      'You can only delete tasks that you created. This task belongs to another user.',
  })
  async deleteTask(
    @GetUserId() userId: string,
    @Param('taskId') taskId: string,
  ) {
    await this.taskService.deleteTask(userId, taskId);
    return successResponse(null, 'Your task has been deleted successfully');
  }

  @Get('task-dashboard/summary')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get task dashboard summary',
    description:
      'Get summary statistics for tasks including total, completed, in progress, and not completed counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Task dashboard summary retrieved successfully',
  })
  async getTaskDashboardSummary() {
    return await this.taskService.getTaskDashboardSummary();
  }

  @Get('task-dashboard/my-tasks-summary')
  @ApiBearerAuth()
  async myRecentTask(@GetUserId() userId: string) {
    return await this.taskService.myRecentTask(userId);
  }
}
