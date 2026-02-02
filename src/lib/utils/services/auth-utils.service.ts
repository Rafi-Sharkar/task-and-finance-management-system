import { ENVEnum } from '@/common/enum/env.enum';
import { JWTPayload, TokenPair } from '@/core/jwt/jwt.interface';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthUtilsService {
  private saltRounds = 10;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(payload: JWTPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow(ENVEnum.JWT_SECRET),
      expiresIn: this.configService.getOrThrow(ENVEnum.JWT_EXPIRES_IN),
    });
  }

  async generateTokenPair(payload: JWTPayload): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(payload);

    const refreshTokenLength =
      parseInt(
        this.configService.get(ENVEnum.REFRESH_TOKEN_LENGTH) || '64',
        10,
      ) || 64;
    const refreshTokenDays =
      parseInt(
        this.configService.get(ENVEnum.REFRESH_TOKEN_EXPIRES_DAYS) || '30',
        10,
      ) || 30;

    // Generate refresh token: randomBytes(32) produces 32 bytes = 64 hex characters
    // For different lengths: divide by 2 because each byte becomes 2 hex chars
    const bytesNeeded = Math.max(32, Math.floor(refreshTokenLength / 2));
    const refreshToken = randomBytes(bytesNeeded).toString('hex');

    const refreshTokenExpiresAt = new Date(
      Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000,
    );

    // Check if refresh token exists for this user
    const existingToken = await this.prisma.client.refreshToken.findUnique({
      where: { userId: payload.sub },
    });

    if (existingToken) {
      // Update existing refresh token
      await this.prisma.client.refreshToken.update({
        where: { userId: payload.sub },
        data: {
          token: refreshToken,
          expiresAt: refreshTokenExpiresAt,
        },
      });
    } else {
      // Create new refresh token
      await this.prisma.client.refreshToken.create({
        data: {
          token: refreshToken,
          userId: payload.sub,
          expiresAt: refreshTokenExpiresAt,
        },
      });
    }

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }
}

//       user?.profilePictureId && user?.profilePicture
//         ? (user.profilePicture.url ?? null)
//         : null;

//     const flatData = {
//       ...user,
//       profilePictureId: user?.profilePictureId ?? null,
//       profilePictureUrl,
//     };

//     return plainToInstance(UserResponseDto, flatData, {
//       excludeExtraneousValues: true,
//     }) as T;
//   }

//   generateToken(payload: JWTPayload): string {
//     const token = this.jwtService.sign(payload, {
//       secret: this.configService.getOrThrow(ENVEnum.JWT_SECRET),
//       expiresIn: this.configService.getOrThrow(ENVEnum.JWT_EXPIRES_IN),
//     });

//     return token;
//   }

//   async generateTokenPairAndSave(payload: JWTPayload): Promise<TokenPair> {
//     const accessToken = this.generateToken(payload);

//     const refreshToken = randomBytes(
//       Math.max(32, Math.floor(this.refreshTokenLength / 2)),
//     ).toString('hex');

//     const refreshTokenExpiresAt = new Date(
//       Date.now() + this.refreshTokenDays * 24 * 60 * 60 * 1000,
//     );

//     await this.prisma.client.refreshToken.create({
//       data: {
//         token: refreshToken,
//         userId: payload.sub,
//         expiresAt: refreshTokenExpiresAt,
//       },
//     });

//     return {
//       accessToken,
//       refreshToken,
//       refreshTokenExpiresAt,
//     };
//   }

//   verifyToken<T extends object = any>(token: string): T {
//     const secret = this.configService.getOrThrow<string>(ENVEnum.JWT_SECRET);
//     try {
//       return this.jwtService.verify<T>(token, { secret });
//     } catch (err) {
//       console.error(err);
//       throw new UnauthorizedException('Invalid or expired token');
//     }
//   }

//   decodeToken(token: string): any {
//     return this.jwtService.decode(token);
//   }

//   async revokeRefreshToken(token: string) {
//     await this.prisma.client.refreshToken.deleteMany({ where: { token } });
//   }

//   async revokeAllRefreshTokensForUser(userId: string) {
//     await this.prisma.client.refreshToken.deleteMany({ where: { userId } });
//   }

//   async findRefreshToken(token: string) {
//     return this.prisma.client.refreshToken.findUnique({ where: { token } });
//   }

//   generateOtpAndExpiry(minutes = 5): { otp: number; expiryTime: Date } {
//     const otp = randomInt(1000, 10000);
//     const expiryTime = new Date(Date.now() + minutes * 60 * 1000);
//     return { otp, expiryTime };
//   }

//   async generateOTPAndSave(userId: string, type: OtpType) {
//     const { otp, expiryTime } = this.generateOtpAndExpiry();
//     const hashedOtp = await this.hash(otp.toString());
//     await this.prisma.client.userOtp.create({
//       data: {
//         userId,
//         code: hashedOtp,
//         type,
//         expiresAt: expiryTime,
//       },
//     });
//     return otp;
//   }

//   async getSanitizedUserById(id: string) {
//     const user = await this.prisma.client.user.findUniqueOrThrow({
//       where: { id },
//       include: { profilePicture: true },
//     });

//     return this.sanitizeUser<UserResponseDto>(user);
//   }

//   async getUserByEmail(email: string) {
//     const user = await this.prisma.client.user.findUnique({
//       where: { email },
//       include: { profilePicture: true },
//     });

//     if (!user) return null;

//     return this.sanitizeUser<UserResponseDto>(user);
//   }

//   async hash(value: string): Promise<string> {
//     return bcrypt.hash(value, this.saltRounds);
//   }

//   async compare(value: string, hash: string): Promise<boolean> {
//     return bcrypt.compare(value, hash);
//   }
// }
