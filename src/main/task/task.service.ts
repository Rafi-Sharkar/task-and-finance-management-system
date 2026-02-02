import { PrismaService } from '@/lib/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../sm-notification/sm-notification.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { FilterTaskDto } from './dto/filter-task.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from '@prisma';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Create a new task
   */
  async createTask(userId: string, dto: CreateTaskDto) {
    try {
      this.logger.log(`Creating task "${dto.title}" by user ${userId}`);

      // Validate at least one employee ID
      if (!dto.employeeIds || dto.employeeIds.length === 0) {
        throw new BadRequestException(
          'At least one employee ID is required to create a task',
        );
      }

      // Create task
      const task = await this.prisma.client.task.create({
        data: {
          title: dto.title,
          createdBy: userId,
          deadline: dto.deadline ? new Date(dto.deadline) : null,
          priority: dto.priority || 'MEDIUM',
          note: dto.note,
          status: dto.status || 'IN_PROGRESS',
        },
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          assignments: {
            include: {
              employee: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });

      // Assign to employees if provided
      if (dto.employeeIds && dto.employeeIds.length > 0) {
        await this.assignTaskToEmployees(task.id, userId, dto.employeeIds);
      }

      // Create audit log for task creation
      await this.auditService.createLog({
        userId,
        action: 'TASK_CREATED',
      });

      // Send notification to all assigned employees and creator
      await this.notificationService.notifyTaskAssignment(
        task.id,
        userId,
        dto.employeeIds,
        dto.title,
      );

      // Fetch complete task with assignments
      const completeTask = await this.prisma.client.task.findUnique({
        where: { id: task.id },
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          assignments: {
            include: {
              employee: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Send notifications to assigned employees
      // if (dto.employeeIds && dto.employeeIds.length > 0) {
      //   await this.notificationHelper.notifyTaskAssigned(
      //     task.id,
      //     dto.title,
      //     dto.employeeIds,
      //     userId,
      //     task.creator.fullName || task.creator.email,
      //     dto.deadline ? new Date(dto.deadline) : undefined,
      //     dto.priority,
      //   );
      // }

      return completeTask;
    } catch (error) {
      this.logger.error(`Error creating task: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all tasks with filters
   */
  //   async getAllTasks(userId: string, filters: FilterTaskDto) {
  //     this.logger.log(`Fetching tasks with filters for user ${userId}`);

  //     const where: any = {
  //       isDeleted: false,
  //     };

  //     // Apply filters
  //     if (filters.managerId) {
  //       where.createdBy = filters.managerId;
  //     }

  //     if (filters.priority) {
  //       where.priority = filters.priority;
  //     }

  //     if (filters.status) {
  //       where.status = filters.status;
  //     }

  //     if (filters.deadline) {
  //       const deadlineDate = new Date(filters.deadline);
  //       where.deadline = {
  //         gte: new Date(deadlineDate.setHours(0, 0, 0, 0)),
  //         lte: new Date(deadlineDate.setHours(23, 59, 59, 999)),
  //       };
  //     }

  //     if (filters.title) {
  //       where.title = {
  //         contains: filters.title,
  //         mode: 'insensitive',
  //       };
  //     }

  //     const tasks = await this.prisma.client.task.findMany({
  //       where,
  //       include: {
  //         project: {
  //           select: {
  //             id: true,
  //             name: true,
  //           },
  //         },
  //         client: {
  //           select: {
  //             id: true,
  //             fullName: true,
  //             email: true,
  //           },
  //         },
  //         creator: {
  //           select: {
  //             id: true,
  //             fullName: true,
  //             email: true,
  //           },
  //         },
  //         assignments: {
  //           include: {
  //             employee: {
  //               select: {
  //                 id: true,
  //                 fullName: true,
  //                 email: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //       orderBy: { createdAt: 'desc' },
  //     });

  //     return tasks;
  //   }

  /**
   * Get tasks by manager ID
   */
  async getTasksByManagerId(managerId: string, filters?: FilterTaskDto) {
    try {
      this.logger.log(`Fetching tasks for manager ${managerId}`);

      const where: any = {
        createdBy: managerId,
        isDeleted: false,
      };

      // Apply additional filters (except managerId)
      if (filters?.priority) {
        where.priority = filters.priority;
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.deadline) {
        const deadlineDate = new Date(filters.deadline);
        where.deadline = {
          gte: new Date(deadlineDate.setHours(0, 0, 0, 0)),
          lte: new Date(deadlineDate.setHours(23, 59, 59, 999)),
        };
      }

      if (filters?.title) {
        where.title = {
          contains: filters.title,
          mode: 'insensitive',
        };
      }

      const tasks = await this.prisma.client.task.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          assignments: {
            include: {
              employee: {
                select: {
                  id: true,
                  avatarUrl: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return tasks;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(userId: string, taskId: string) {
    try {
      this.logger.log(`Fetching task ${taskId} for user ${userId}`);

      const task = await this.prisma.client.task.findUnique({
        where: { id: taskId },
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          assignments: {
            include: {
              employee: {
                select: {
                  id: true,
                  avatarUrl: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!task) {
        throw new NotFoundException(
          "We couldn't find the task you're looking for. It may have been deleted or the ID is incorrect.",
        );
      }

      if (task.isDeleted) {
        throw new NotFoundException(
          'This task has been deleted and is no longer available.',
        );
      }

      return task;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get my assigned tasks (for all users)
   */
  async getMyAssignedTasks(employeeId: string, filters?: FilterTaskDto) {
    try {
      this.logger.log(`Fetching assigned tasks for employee ${employeeId}`);

      // First get all task assignments for this employee
      const assignments = await this.prisma.client.taskAssignment.findMany({
        where: { employeeId },
        include: {
          task: {
            include: {
              creator: {
                select: {
                  id: true,
                  role: true,
                  fullName: true,
                  email: true,
                },
              },
              assignments: {
                include: {
                  employee: {
                    select: {
                      id: true,
                      avatarUrl: true,
                      fullName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          assigner: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      });

      // Transform the data to include assignment details with task data
      let tasks = assignments.map((assignment) => ({
        ...assignment.task,
        assignmentId: assignment.id,
        assignmentStatus: assignment.status,
        completedAt: assignment.completedAt,
        assignedAt: assignment.assignedAt,
        assignedBy: assignment.assigner,
      }));

      // Apply filters if provided
      if (filters?.priority) {
        tasks = tasks.filter((task) => task.priority === filters.priority);
      }

      if (filters?.status) {
        tasks = tasks.filter(
          (task) => task.assignmentStatus === filters.status,
        );
      }

      if (filters?.deadline) {
        const deadlineDate = new Date(filters.deadline);
        const dayStart = new Date(deadlineDate.setHours(0, 0, 0, 0));
        const dayEnd = new Date(deadlineDate.setHours(23, 59, 59, 999));
        tasks = tasks.filter(
          (task) =>
            task.deadline &&
            task.deadline >= dayStart &&
            task.deadline <= dayEnd,
        );
      }
      if (filters?.title) {
        tasks = tasks.filter((task) =>
          task.title.toLowerCase().includes(filters.title?.toLowerCase() || ''),
        );
      }

      return tasks;
    } catch (error) {
      this.logger.error(
        `Error fetching assigned tasks for employee ${employeeId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Update task
   */
  async updateTask(userId: string, taskId: string, dto: UpdateTaskDto) {
    try {
      this.logger.log(`Updating task ${taskId} by user ${userId}`);

      const task = await this.prisma.client.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException(
          "We couldn't find the task you're trying to update. It may have been deleted.",
        );
      }

      if (task.isDeleted) {
        throw new NotFoundException(
          'This task has been deleted and cannot be updated.',
        );
      }

      if (task.createdBy !== userId) {
        throw new ForbiddenException(
          'You can only update tasks that you created. This task belongs to another user.',
        );
      }

      const updatedTask = await this.prisma.client.task.update({
        where: { id: taskId },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.deadline !== undefined && {
            deadline: dto.deadline ? new Date(dto.deadline) : null,
          }),
          ...(dto.priority && { priority: dto.priority }),
          ...(dto.note !== undefined && { note: dto.note }),
          ...(dto.status && { status: dto.status }),
          updatedAt: new Date(),
        },
        include: {
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          assignments: {
            include: {
              employee: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      // Update task assignments if provided
      if (dto.employeeIds !== undefined) {
        // Remove old assignments
        await this.prisma.client.taskAssignment.deleteMany({
          where: { taskId: taskId },
        });

        // Add new assignments
        if (dto.employeeIds.length > 0) {
          await this.assignTaskToEmployees(taskId, userId, dto.employeeIds);

          // Notify newly assigned employees
          // await this.notificationHelper.notifyTaskAssigned(
          //   taskId,
          //   updatedTask.title,
          //   dto.employeeIds,
          //   userId,
          //   updatedTask.creator.fullName || updatedTask.creator.email,
          //   dto.deadline ? new Date(dto.deadline) : task.deadline || undefined,
          //   dto.priority || task.priority,
          // );
        }
      }

      this.logger.debug(`Task updated successfully: ${taskId}`);

      // Create audit log for task update
      await this.auditService.createLog({
        userId,
        action: 'TASK_UPDATED',
      });

      return updatedTask;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete task (soft delete)
   */
  async deleteTask(userId: string, taskId: string) {
    try {
      this.logger.log(`Deleting task ${taskId} by user ${userId}`);

      const task = await this.prisma.client.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException(
          "We couldn't find the task you're trying to delete. It may have already been removed.",
        );
      }

      if (task.isDeleted) {
        throw new NotFoundException('This task has already been deleted.');
      }

      if (task.createdBy !== userId) {
        throw new ForbiddenException(
          'You can only delete tasks that you created. This task belongs to another user.',
        );
      }

      // Delete all task assignments first
      await this.prisma.client.taskAssignment.deleteMany({
        where: { taskId: taskId },
      });

      // Hard delete the task
      const deletedTask = await this.prisma.client.task.delete({
        where: { id: taskId },
      });

      this.logger.debug(`Task hard-deleted successfully: ${taskId}`);

      // Create audit log for task deletion
      await this.auditService.createLog({
        userId,
        action: 'TASK_DELETED',
      });

      return deletedTask;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Assign task to employees
   */
  private async assignTaskToEmployees(
    taskId: string,
    assignerId: string,
    employeeIds: string[],
  ) {
    for (const employeeId of employeeIds) {
      // Verify employee exists and has EMPLOYEE role
      const employee = await this.prisma.client.user.findUnique({
        where: { id: employeeId },
      });

      if (!employee) {
        this.logger.warn(`Employee ${employeeId} not found, skipping`);
        continue;
      }

      if (employee.role !== 'EMPLOYEE' && employee.role !== 'MANAGER') {
        this.logger.warn(
          `User ${employeeId} is not an EMPLOYEE or MANAGER, skipping`,
        );
        continue;
      }

      // Create task assignment
      await this.prisma.client.taskAssignment.create({
        data: {
          taskId: taskId,
          employeeId: employeeId,
          assignedBy: assignerId,
          status: 'IN_PROGRESS',
        },
      });
    }
  }

  /**
   * Update task assignment status
   */
  async updateAssignmentStatus(
    userId: string,
    assignmentId: string,
    dto: UpdateAssignmentStatusDto,
  ) {
    try {
      this.logger.log(
        `Updating assignment ${assignmentId} status to ${dto.status} by user ${userId}`,
      );

      // Find the assignment
      const assignment = await this.prisma.client.taskAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          task: true,
          employee: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      if (!assignment) {
        throw new NotFoundException(
          "We couldn't find the task assignment you're trying to update. It may have been removed.",
        );
      }

      // Log for debugging
      this.logger.debug(
        `Assignment check - assignmentId: ${assignmentId}, assignment.employeeId: ${assignment.employeeId}, current userId: ${userId}`,
      );

      // Verify user is the assigned employee
      if (assignment.employeeId !== userId) {
        this.logger.error(
          `User ${userId} tried to update assignment ${assignmentId} which belongs to ${assignment.employeeId}`,
        );
        throw new ForbiddenException(
          `You can only update your own task assignments. This assignment (${assignmentId}) belongs to employee ${assignment.employee.fullName}.`,
        );
      }

      // Verify task is not deleted
      if (assignment.task.isDeleted) {
        throw new BadRequestException(
          'This task has been deleted and its assignment status cannot be updated.',
        );
      }

      // Prepare update data
      const updateData: any = {
        status: dto.status,
      };

      // Set completedAt timestamp when status changes to COMPLETED
      if (dto.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }

      // Clear completedAt if status changes away from COMPLETED
      if (dto.status !== 'COMPLETED' && assignment.completedAt) {
        updateData.completedAt = null;
      }

      // Update the assignment
      const updatedAssignment = await this.prisma.client.taskAssignment.update({
        where: { id: assignmentId },
        data: updateData,
        include: {
          task: {
            include: {
              creator: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          employee: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // Check if all task assignments for this task are COMPLETED
      if (dto.status === 'COMPLETED') {
        const taskAssignments =
          await this.prisma.client.taskAssignment.findMany({
            where: { taskId: assignment.taskId },
          });

        const allCompleted = taskAssignments.every(
          (a) => a.status === 'COMPLETED',
        );

        // If all assignments are completed, auto-complete the task
        if (allCompleted) {
          await this.prisma.client.task.update({
            where: { id: assignment.taskId },
            data: {
              status: 'COMPLETED',
              updatedAt: new Date(),
            },
          });

          this.logger.debug(
            `Task ${assignment.taskId} auto-completed as all assignments are completed`,
          );
        }

        // Notify task creator that the task has been completed
        // await this.notificationHelper.notifyTaskCompleted(
        //   assignment.taskId,
        //   updatedAssignment.task.title,
        //   userId,
        //   updatedAssignment.employee.fullName ||
        //     updatedAssignment.employee.email,
        //   updatedAssignment.task.createdBy,
        // );
      }

      this.logger.debug(
        `Assignment status updated successfully: ${assignmentId}`,
      );
      // Create audit log for assignment status update
      await this.auditService.createLog({
        userId,
        action: 'TASK_ASSIGNMENT_UPDATED',
      });
      return updatedAssignment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get recent tasks assigned to a user
   */
  async getMyRecentTask(userId: string, page?: number, limit?: number) {
    this.logger.log(`Fetching recent tasks for user ${userId}`);

    // Calculate pagination
    const pageNum = page && page > 0 ? Number(page) : 1;
    const limitNum = limit && limit > 0 ? Number(limit) : 10;
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {
      employeeId: userId,
    };

    // Get total count for pagination metadata
    const total = await this.prisma.client.taskAssignment.count({ where });

    // Get paginated recent tasks
    const recentTasks = await this.prisma.client.taskAssignment.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            deadline: true,
            priority: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        assigner: {
          select: {
            id: true,
            fullName: true,
            role: true,
            email: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
      skip,
      take: limitNum,
    });

    return {
      success: true,
      data: recentTasks,
      metadata: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getTaskDashboardSummary() {
    const totalTasks = await this.prisma.client.task.count();

    const completedTasks = await this.prisma.client.task.count({
      where: { status: TaskStatus.COMPLETED },
    });

    const pendingTasks = await this.prisma.client.task.count({
      where: { status: TaskStatus.IN_PROGRESS },
    });

    const notcompletedTasks = await this.prisma.client.task.count({
      where: { status: TaskStatus.NOT_COMPLETED },
    });

    return {
      success: true,
      data: {
        totalTasks,
        completedTasks,
        pendingTasks,
        notcompletedTasks,
      },
      message: 'Task dashboard summary retrieved successfully',
    };
  }

  async myRecentTask(userId: string) {
    const totalJoinTasks = await this.prisma.client.task.count({
      where: { createdBy: userId },
    });

    const inProgressTasks = await this.prisma.client.task.count({
      where: { createdBy: userId, status: TaskStatus.IN_PROGRESS },
    });

    const completedTasks = await this.prisma.client.task.count({
      where: { createdBy: userId, status: TaskStatus.COMPLETED },
    });

    const notcompletedTasks = await this.prisma.client.task.count({
      where: { createdBy: userId, status: TaskStatus.NOT_COMPLETED },
    });

    return {
      success: true,
      data: {
        totalJoinTasks,
        inProgressTasks,
        completedTasks,
        notcompletedTasks,
      },
      message: 'My task dashboard summary retrieved successfully',
    };
  }
}
