import { Controller, Post, Get, Body, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { HandleFriendRequestDto } from './dto/handle-friend-request.dto';
import { RemoveFriendDto } from './dto/remove-friend.dto';

@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  /**
   * Send a friend request to another user.
   * @param req - The request object containing session data.
   * @param sendFriendRequestDto - DTO containing recipient identifier.
   */
  @Post('request')
  async sendFriendRequest(
    @Req() req: Request,
    @Body() sendFriendRequestDto: SendFriendRequestDto,
  ) {
    const requesterId = req.session?.userId;
    if (!requesterId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.friendsService.sendFriendRequest(requesterId, sendFriendRequestDto);
  }

  /**
   * Accept a friend request.
   * @param req - The request object containing session data.
   * @param handleFriendRequestDto - DTO containing the friend request ID.
   */
  @Post('accept')
  async acceptFriendRequest(
    @Req() req: Request,
    @Body() handleFriendRequestDto: HandleFriendRequestDto,
  ) {
    const recipientId = req.session?.userId;
    if (!recipientId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.friendsService.acceptFriendRequest(recipientId, handleFriendRequestDto.requestId);
  }

  /**
   * Decline a friend request.
   * @param req - The request object containing session data.
   * @param handleFriendRequestDto - DTO containing the friend request ID.
   */
  @Post('decline')
  async declineFriendRequest(
    @Req() req: Request,
    @Body() handleFriendRequestDto: HandleFriendRequestDto,
  ) {
    const recipientId = req.session?.userId;
    if (!recipientId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.friendsService.declineFriendRequest(recipientId, handleFriendRequestDto.requestId);
  }

  /**
   * Revoke a friend request.
   * @param req - The request object containing session data.
   * @param handleFriendRequestDto - DTO containing the friend request ID.
   */
  @Post('revoke')
  async revokeFriendRequest(
    @Req() req: Request,
    @Body() handleFriendRequestDto: HandleFriendRequestDto,
  ) {
    const requesterId = req.session?.userId;
    if (!requesterId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.friendsService.revokeFriendRequest(requesterId, handleFriendRequestDto.requestId);
  }

  /**
   * Remove an existing friend.
   * @param req - The request object containing session data.
   * @param removeFriendDto - DTO containing the friend's ID.
   */
  @Post('remove')
  async removeFriend(@Req() req: Request, @Body() removeFriendDto: RemoveFriendDto) {
    const userId = req.session?.userId;
    if (!userId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.friendsService.removeFriend(userId, removeFriendDto.friendId);
  }

  /**
   * Retrieve incoming friend requests.
   * @param req - The request object containing session data.
   */
  @Get('requests')
  async getFriendRequests(@Req() req: Request) {
    const userId = req.session?.userId;
    if (!userId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.friendsService.getFriendRequests(userId);
  }

  /**
   * Retrieve the friend list for the current user.
   * @param req - The request object containing session data.
   */
  @Get('list')
  async getFriendList(@Req() req: Request) {
    const userId = req.session?.userId;
    if (!userId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.friendsService.getFriendList(userId);
  }
}
