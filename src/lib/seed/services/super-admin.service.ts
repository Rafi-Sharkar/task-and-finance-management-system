import { ENVEnum } from '@/common/enum/env.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { AuthUtilsService } from '@/lib/utils/services/auth-utils.service';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SuperAdminService implements OnModuleInit {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authUtils: AuthUtilsService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): Promise<void> {
    return this.seedSuperAdminUser();
  }

  async seedSuperAdminUser(): Promise<void> {
    const superAdminName = this.configService.getOrThrow<string>(
      ENVEnum.SUPER_ADMIN_NAME,
    );
    const superAdminUsername = this.configService.getOrThrow<string>(
      ENVEnum.SUPER_ADMIN_USERNAME,
    );
    const superAdminEmail = this.configService.getOrThrow<string>(
      ENVEnum.SUPER_ADMIN_EMAIL,
    );
    const superAdminPhone = this.configService.getOrThrow<string>(
      ENVEnum.SUPER_ADMIN_PHONE,
    );
    const superAdminPass = this.configService.getOrThrow<string>(
      ENVEnum.SUPER_ADMIN_PASS,
    );
    const passwordHash = await this.authUtils.hash(superAdminPass);

    const superAdminExists = await this.prisma.client.user.findFirst({
      where: {
        email: superAdminEmail,
      },
    });

    // * create super admin
    if (!superAdminExists) {
      await this.prisma.client.user.create({
        data: {
          fullName: superAdminName,
          username: superAdminUsername,
          email: superAdminEmail,
          phone: superAdminPhone,
          passwordHash,
          role: 'SUPER_ADMIN',
          accountStatus: 'ACTIVE',
          changePasswordRequired: false,
          isActive: true,
          isVerified: true,
          isDeleted: false,
          lastLogin: new Date(),
          lastActive: new Date(),
        },
      });
      this.logger.log(
        `[CREATE] Super Admin user created with email: ${superAdminEmail}`,
      );
      return;
    }

    // * Log & update if super admin already exists
    await this.prisma.client.user.update({
      where: {
        email: superAdminEmail,
      },
      data: {
        fullName: superAdminName,
        username: superAdminUsername,
        phone: superAdminPhone,
        passwordHash,
        accountStatus: 'ACTIVE',
        isVerified: true,
        role: 'SUPER_ADMIN',
        isActive: true,
        isDeleted: false,
        lastActive: new Date(),
        lastLogin: new Date(),
      },
    });

    this.logger.log(
      `[UPDATE] Super Admin user updated with email: ${superAdminEmail}`,
    );
  }
}
