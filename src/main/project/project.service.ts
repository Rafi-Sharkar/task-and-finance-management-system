/* eslint-disable @typescript-eslint/no-unused-vars */
import { JWTPayload } from '@/core/jwt/jwt.interface';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { S3Service } from '../../lib/file/services/s3.service';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DocumentCategory } from '../document/dto/create-document.dto';
// import { NotificationHelperService } from '../notification/notification-helper.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_TYPES } from '../sm-notification/interface/event.name';
import { ProjectAssignmentEvent } from '../sm-notification/interface/events.payload';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2, // private readonly notificationHelper: NotificationHelperService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    files: Express.Multer.File[],
    user: JWTPayload,
  ) {
    const {
      name,
      clientId,
      description,
      startDate,
      endDate,
      note,
      assignedManagers,
    } = createProjectDto;

    // Verify client exists
    const client = await this.prisma.client.user.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }

    // Verify all assigned managers exist if provided
    if (assignedManagers && assignedManagers.length > 0) {
      const managers = await this.prisma.client.user.findMany({
        where: { id: { in: assignedManagers } },
      });

      if (managers.length !== assignedManagers.length) {
        throw new BadRequestException(
          'One or more assigned managers do not exist',
        );
      }
    }

    // Create project with assigned managers in a transaction
    const project = await this.prisma.client.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name,
          clientId,
          createdBy: user.sub,
          note,
          description: description || null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
        },
      });

      if (files && files.length > 0) {
        for (const file of files) {
          const s3Url = `mock-url/${file.originalname}`;
          const document = await tx.document.create({
            data: {
              name: newProject.name,
              uploadedBy: user.sub,
              projectId: newProject.id,
              documentCateory: DocumentCategory.PROJECT_DOC,
              shareToClient: false,
            },
          });

          await tx.file.create({
            data: {
              documentId: document.id,
              url: s3Url,
              mimeType: file.mimetype,
              sizeKB: Math.round(file.size / 1024),
              extension: file.originalname.split('.').pop() || '',
            },
          });
        }
      }

      return tx.project.findUnique({
        where: { id: newProject.id },
        include: {
          created: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          client: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });
    });

    // Create audit log for project creation
    await this.auditService.createLog({
      userId: user.sub,
      action: 'PROJECT_CREATED',
    });

    // Send notifications to assigned managers if any
    if (project && assignedManagers && assignedManagers.length > 0) {
      const assignedUsers = await this.prisma.client.user.findMany({
        where: {
          id: { in: assignedManagers },
          isActive: true,
          isDeleted: false,
        },
        select: {
          id: true,
          email: true,
        },
      });

      this.eventEmitter.emit(EVENT_TYPES.PROJECT_ASSIGNMENT, {
        action: 'CREATE',
        info: {
          projectId: project.id,
          projectName: project.name,
          createdBy: project.createdBy,
          status: 'ASSIGNED',
          description: project.description ?? '',
          assignedBy: user.sub,
          assignedAt: new Date(),
          recipients: assignedUsers,
        },
        meta: {
          projectId: project.id,
          projectName: project.name,
          createdBy: project.createdBy,
          status: 'ASSIGNED',
          description: project.description ?? '',
          assignedBy: user.sub,
          assignedAt: new Date(),
        },
      } satisfies ProjectAssignmentEvent);
    }

    return {
      success: true,
      message: 'Project created successfully',
      data: project,
    };
  }

  findAll() {
    return `This action returns all project`;
  }

  findOne(id: number) {
    return `This action returns a #${id} project`;
  }

  update(id: number, updateProjectDto: UpdateProjectDto) {
    return `This action updates a #${id} project`;
  }

  remove(id: number) {
    return `This action removes a #${id} project`;
  }
}
