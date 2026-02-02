import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { FilterAuditLogDto } from './dto/filter-audit-log.dto';
import { FilterMyAuditLogDto } from './dto/filter-my-audit-log.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async createLog(data: CreateAuditLogDto) {
    try {
      return this.prisma.client.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getMyLogs(userId: string, filters: FilterMyAuditLogDto) {
    try {
      const {
        page = 1,
        limit = 10,
        startDate,
        endDate,
        action,
        search,
      } = filters;
      const skip = (page - 1) * limit;

      const where: Prisma.AuditLogWhereInput = {
        userId, // Always filter by current user only
        ...(action && { action }),
        ...(search && {
          action: { contains: search, mode: 'insensitive' },
        }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      const [logs, total] = await Promise.all([
        this.prisma.client.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
              },
            },
          },
        }),
        this.prisma.client.auditLog.count({ where }),
      ]);

      return {
        data: logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

  async getManagerLogs(managerId: string, filters: FilterAuditLogDto) {
    try {
      // Verify current user is a manager
      const manager = await this.prisma.client.user.findUnique({
        where: { id: managerId },
        select: {
          role: true,
          isActive: true,
          isVerified: true,
          isDeleted: true,
        },
      });

      if (!manager) {
        throw new Error('User not found');
      }

      if (manager.role !== 'MANAGER') {
        throw new Error('Access denied: User is not a manager');
      }

      if (!manager.isActive || manager.isDeleted) {
        throw new Error('Access denied: User account is not active');
      }

      const {
        page = 1,
        limit = 10,
        startDate,
        endDate,
        action,
        userId,
        search,
      } = filters;
      const skip = (page - 1) * limit;

      // Get all users with roles EMPLOYEE, CLIENT, FINANCE
      const usersToInclude = await this.prisma.client.user.findMany({
        where: {
          role: {
            in: ['EMPLOYEE', 'CLIENT', 'FINANCE'],
          },
        },
        select: { id: true },
      });

      const userIds = [managerId, ...usersToInclude.map((u) => u.id)];

      const where: Prisma.AuditLogWhereInput = {
        userId: { in: userIds },
        ...(userId && { userId }),
        ...(action && { action }),
        ...(search && {
          OR: [
            { action: { contains: search, mode: 'insensitive' } },
            { user: { fullName: { contains: search, mode: 'insensitive' } } },
            { user: { username: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      const [logs, total] = await Promise.all([
        this.prisma.client.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
              },
            },
          },
        }),
        this.prisma.client.auditLog.count({ where }),
      ]);

      return {
        data: logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

  async getAdminLogs(adminId: string, filters: FilterAuditLogDto) {
    try {
      // Verify current user is an admin or super admin
      const admin = await this.prisma.client.user.findUnique({
        where: { id: adminId },
        select: {
          role: true,
          isActive: true,
          isVerified: true,
          isDeleted: true,
        },
      });

      if (!admin) {
        throw new Error('User not found');
      }

      if (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN') {
        throw new Error('Access denied: User is not an admin');
      }

      if (!admin.isActive || admin.isDeleted) {
        throw new Error('Access denied: User account is not active');
      }

      if (!admin.isVerified) {
        throw new Error('Access denied: User account is not verified');
      }

      const {
        page = 1,
        limit = 10,
        startDate,
        endDate,
        action,
        userId,
        search,
      } = filters;
      const skip = (page - 1) * limit;

      const where: Prisma.AuditLogWhereInput = {
        ...(userId && { userId }),
        ...(action && { action }),
        ...(search && {
          OR: [
            { action: { contains: search, mode: 'insensitive' } },
            { user: { fullName: { contains: search, mode: 'insensitive' } } },
            { user: { username: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
              },
            }
          : {}),
      };

      const [logs, total] = await Promise.all([
        this.prisma.client.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                role: true,
              },
            },
          },
        }),
        this.prisma.client.auditLog.count({ where }),
      ]);

      return {
        data: logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }
}
