import { ENVEnum } from '@/common/enum/env.enum';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWTPayload } from './jwt.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = config.getOrThrow<string>(ENVEnum.JWT_SECRET);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JWTPayload) {
    // Validate payload structure
    if (!payload.sub || !payload.email || !payload.role) {
      this.logger.warn('Invalid JWT payload structure');
      throw new UnauthorizedException('Invalid token');
    }

    // Verify user exists
    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isDeleted: true,
        isActive: true,
        isVerified: true,
        accountStatus: true,
      },
    });

    if (!user) {
      this.logger.warn(`User not found for token: ${payload.sub}`);
      throw new UnauthorizedException('User not found');
    }

    if (user.isDeleted) {
      this.logger.warn(`Deleted user attempted access: ${payload.sub}`);
      throw new UnauthorizedException('User account has been deleted');
    }

    if (!user.isActive) {
      this.logger.warn(`Inactive user attempted access: ${payload.sub}`);
      throw new UnauthorizedException('User account is not active');
    }

    // Update lastActive on each request
    try {
      await this.prisma.client.user.update({
        where: { id: payload.sub },
        data: { lastActive: new Date() },
      });
    } catch {
      this.logger.error(`Failed to update lastActive for user ${payload.sub}`);
      // Don't fail the request if lastActive update fails
    }

    // Return payload for req.user
    return payload;
  }
}
