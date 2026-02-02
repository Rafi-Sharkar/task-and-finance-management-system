import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class TestUsersService implements OnModuleInit {
  private readonly logger = new Logger(TestUsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedTestUsers();
  }

  async seedTestUsers(): Promise<void> {
    const password = 'Password123!';
    const passwordHash = await this.authUtils.hash(password);

    const testUsers = [
      // Admins
      {
        fullName: 'Admin User One',
        username: 'admin1',
        email: 'admin1@company.com',
        phone: '+1234567801',
        passwordHash,
        role: 'ADMIN' as const,
        accountStatus: 'ACTIVE' as const,
        isActive: true,
        changePasswordRequired: false,
        isVerified: true,
      },
      {
        fullName: 'Admin User Two',
        username: 'admin2',
        email: 'admin2@company.com',
        phone: '+1234567802',
        passwordHash,
        role: 'ADMIN' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      // Managers
      {
        fullName: 'Manager Smith',
        username: 'manager1',
        email: 'manager1@company.com',
        phone: '+1234567803',
        passwordHash,
        role: 'MANAGER' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      {
        fullName: 'Manager Johnson',
        username: 'manager2',
        email: 'manager2@company.com',
        phone: '+1234567804',
        passwordHash,
        role: 'MANAGER' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      {
        fullName: 'Manager Williams',
        username: 'manager3',
        email: 'manager3@company.com',
        phone: '+1234567805',
        passwordHash,
        role: 'MANAGER' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      // Employees
      {
        fullName: 'Employee John Doe',
        username: 'employee1',
        email: 'employee1@company.com',
        phone: '+1234567806',
        passwordHash,
        role: 'EMPLOYEE' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      {
        fullName: 'Employee Jane Smith',
        username: 'employee2',
        email: 'employee2@company.com',
        phone: '+1234567807',
        passwordHash,
        role: 'EMPLOYEE' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      {
        fullName: 'Employee Mike Wilson',
        username: 'employee3',
        email: 'employee3@company.com',
        phone: '+1234567808',
        passwordHash,
        role: 'EMPLOYEE' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      {
        fullName: 'Employee Sarah Brown',
        username: 'employee4',
        email: 'employee4@company.com',
        phone: '+1234567809',
        passwordHash,
        role: 'EMPLOYEE' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      {
        fullName: 'Employee David Lee',
        username: 'employee5',
        email: 'employee5@company.com',
        phone: '+1234567810',
        passwordHash,
        role: 'EMPLOYEE' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      // Finance
      {
        fullName: 'Finance Manager Alice',
        username: 'finance1',
        email: 'finance1@company.com',
        phone: '+1234567811',
        passwordHash,
        role: 'FINANCE' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      {
        fullName: 'Finance Officer Bob',
        username: 'finance2',
        email: 'finance2@company.com',
        phone: '+1234567812',
        passwordHash,
        role: 'FINANCE' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      {
        fullName: 'Finance Analyst Carol',
        username: 'finance3',
        email: 'finance3@company.com',
        phone: '+1234567813',
        passwordHash,
        role: 'FINANCE' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      // Clients
      {
        fullName: 'Client Corporation ABC',
        username: 'client1',
        email: 'client1@external.com',
        phone: '+1234567814',
        passwordHash,
        role: 'CLIENT' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      {
        fullName: 'Client XYZ Industries',
        username: 'client2',
        email: 'client2@external.com',
        phone: '+1234567815',
        passwordHash,
        role: 'CLIENT' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
      {
        fullName: 'Client Global Solutions',
        username: 'client3',
        email: 'client3@external.com',
        phone: '+1234567816',
        passwordHash,
        role: 'CLIENT' as const,
        accountStatus: 'ACTIVE' as const,
        changePasswordRequired: false,
        isActive: true,
        isVerified: true,
      },
    ];

    let createdCount = 0;
    let updatedCount = 0;

    for (const userData of testUsers) {
      const existingUser = await this.prisma.client.user.findFirst({
        where: {
          OR: [{ email: userData.email }, { username: userData.username }],
        },
      });

      if (!existingUser) {
        const user = await this.prisma.client.user.create({
          data: {
            ...userData,
            lastLogin: new Date(),
            lastActive: new Date(),
          },
        });

        await this.prisma.client.setting.create({
          data: { userId: user.id },
        });

        createdCount++;
        this.logger.log(
          `[CREATE] ${userData.role} user created: ${userData.email}`,
        );
      } else {
        await this.prisma.client.setting.update({
          where: { userId: existingUser.id },
          data: { userId: existingUser.id },
        });

        await this.prisma.client.user.update({
          where: { id: existingUser.id },
          data: {
            ...userData,
            lastActive: new Date(),
          },
        });
        updatedCount++;
        this.logger.log(
          `[UPDATE] ${userData.role} user updated: ${userData.email}`,
        );
      }
    }

    this.logger.log(
      `Test users seeding completed: ${createdCount} created, ${updatedCount} updated`,
    );
    this.logger.log(`Default password for all test users: ${password}`);
  }
}
