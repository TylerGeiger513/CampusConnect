import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for handling a friend request (accept, decline, or revoke).
 */
export class HandleFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;
}
