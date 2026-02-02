import { UserResponseDto } from '@/common/dto/user-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNWExZjJmMC0xMjM0LTRiNWMtOWE4ZS1hYmNkZWYwMTIzNDUiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJpYXQiOjE3MDQ2MTkyMDEsImV4cCI6MTcxMjM5NTIwMX0.example',
  })
  accessToken: string;

  @ApiProperty({
    example: 'f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8',
  })
  refreshToken: string;

  @ApiProperty({ example: '2026-02-07T00:00:00.000Z' })
  refreshTokenExpiresAt: Date;
}
