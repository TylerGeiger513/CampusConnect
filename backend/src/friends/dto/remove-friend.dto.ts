import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for removing a friend.
 */
export class RemoveFriendDto {
  @IsString()
  @IsNotEmpty()
  friendId: string;
}
