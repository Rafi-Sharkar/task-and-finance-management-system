import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

@Injectable()
export class AiResourceService {
  private readonly logger = new Logger(AiResourceService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getUserResources(id: string) {
    try {
      this.logger.log(`Fetching all resources for user: ${id}`);

      // Verify user exists and get basic info
      const user = await this.prisma.client.user.findUnique({
        where: { id: id },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          accountStatus: true,
          isActive: true,
          lastActive: true,
          lastLogin: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      if (user.role === 'SUPER_ADMIN') {
        this.logger.log(
          `User ${id} is a super admin, fetching all system resources`,
        );
        return this.getSuperAdminResources(id, user);
      }

      // Get all related resources in parallel for efficiency
      const [
        folders,
        documents,
        projectsOwned,
        projectsAsClient,
        tasksCreated,
        assignmentsAsEmployee,
        assignedTasks,
        invoices,
        documentClients,
      ] = await Promise.all([
        // Folders
        this.prisma.client.folder.findMany({
          where: { createdBy: id },
        }),

        // Documents
        this.prisma.client.document.findMany({
          where: { uploadedBy: id },
          select: {
            id: true,
            documentCateory: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),

        // Projects Owned
        this.prisma.client.project.findMany({
          where: { createdBy: id },
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            createdAt: true,
          },
        }),

        // Projects as Client
        this.prisma.client.project.findMany({
          where: { clientId: id },
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        }),

        // Tasks Created
        this.prisma.client.task.findMany({
          where: { createdBy: id },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),

        // Task Assignments (as employee)
        this.prisma.client.taskAssignment.findMany({
          where: { employeeId: id },
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        }),

        // Tasks Assigned by User
        this.prisma.client.taskAssignment.findMany({
          where: { assignedBy: id },
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
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
        }),

        // Invoices
        this.prisma.client.invoice.findMany({
          where: { id },
          select: {
            id: true,
            description: true,
            amount: true,
            invoiceStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),

        // Documents shared to this user (clientId)
        this.prisma.client.document.findMany({
          where: { clientId: id },
          select: {
            id: true,
            status: true,
          },
        }),
      ]);

      // Calculate summary statistics
      const resource = {
        folders,
        documents,
        projectsOwned,
        projectsAsClient,
        tasksCreated,
        assignmentsAsEmployee,
        assignedTasks,
        invoices,
        documentClients,
      };

      return {
        user,
        resource,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching resources for user ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  async getSuperAdminResources(id: string, user: any) {
    try {
      // Get all related resources in parallel for efficiency
      const [
        folders,
        documents,
        projectsOwned,
        projectsAsClient,
        tasksCreated,
        assignmentsAsEmployee,
        assignedTasks,
        invoices,
        documentClients,
      ] = await Promise.all([
        // Folders
        this.prisma.client.folder.findMany({
          where: { createdBy: id },
        }),

        // Documents
        this.prisma.client.document.findMany({
          where: { uploadedBy: id },
          select: {
            id: true,
            documentCateory: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),

        // Projects Owned
        this.prisma.client.project.findMany({
          where: { createdBy: id },
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            createdAt: true,
          },
        }),

        // Projects as Client
        this.prisma.client.project.findMany({
          where: { clientId: id },
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        }),

        // Tasks Created
        this.prisma.client.task.findMany({
          where: { createdBy: id },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),

        // Tasks as Client
        // this.prisma.client.task.findMany({
        //   where: { clientId: id },
        //   select: {
        //     id: true,
        //     title: true,
        //     status: true,
        //     priority: true,
        //   },
        // }),

        // Task Assignments (as employee)
        this.prisma.client.taskAssignment.findMany({
          where: { employeeId: id },
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        }),

        // Tasks Assigned by User
        this.prisma.client.taskAssignment.findMany({
          where: { assignedBy: id },
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
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
        }),

        // Invoices
        this.prisma.client.invoice.findMany({
          where: { id },
          select: {
            id: true,
            description: true,
            amount: true,
            invoiceStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),

        // Documents shared to this user (clientId)
        this.prisma.client.document.findMany({
          where: { clientId: id },
          select: {
            id: true,
            status: true,
          },
        }),
      ]);

      // Calculate summary statistics
      const resource = {
        folders,
        documents,
        projectsOwned,
        projectsAsClient,
        tasksCreated,
        assignmentsAsEmployee,
        assignedTasks,
        invoices,
        documentClients,
      };

      return {
        user,
        resource,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching resources for user ${id}: ${error.message}`,
      );
      throw error;
    }
  }
}
