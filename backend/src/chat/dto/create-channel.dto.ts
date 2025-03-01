import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for creating or retrieving a direct channel.
 */
export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string;
}
