import { UserResponseDto } from '@/common/dto/user-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UserSuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'User registered successfully' })
  message: string;

  @ApiProperty({ type: UserResponseDto })
  data: UserResponseDto;
}
