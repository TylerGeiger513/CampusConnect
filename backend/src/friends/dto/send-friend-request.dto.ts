import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for sending a friend request.
 */
export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  recipient: string; // This can be either a username or a user ID
}
