import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for sending a message in a channel.
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
