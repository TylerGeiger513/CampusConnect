import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { FriendsGateway } from './friends.gateway';
import { FriendRequest } from './interfaces/friend-request.interface';
import { User } from '../auth/interfaces/user.interface';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(
    @InjectModel('FriendRequest') private readonly friendRequestModel: Model<FriendRequest>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly friendsGateway: FriendsGateway,
  ) {}

  /**
   * Sends a friend request from the requester to the recipient.
   * @param requesterId - The ID of the user sending the request.
   * @param dto - DTO containing recipient identifier (username or user ID).
   */
  async sendFriendRequest(
    requesterId: string,
    dto: SendFriendRequestDto,
  ): Promise<{ message: string }> {
    // Determine recipient by ID or username
    let recipientUser;
    const recipientIdentifier = dto.recipient;
    if (recipientIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
      recipientUser = await this.userModel.findById(recipientIdentifier);
    } else {
      recipientUser = await this.userModel.findOne({ username: recipientIdentifier });
    }
    if (!recipientUser) {
      throw new HttpException('Recipient user not found.', HttpStatus.NOT_FOUND);
    }
    if (requesterId === recipientUser._id.toString()) {
      throw new HttpException('You cannot send a friend request to yourself.', HttpStatus.BAD_REQUEST);
    }

    // Check if a friend request already exists
    const existingRequest = await this.friendRequestModel.findOne({
      requester: requesterId,
      recipient: recipientUser._id,
    });
    if (existingRequest) {
      throw new HttpException('Friend request already sent.', HttpStatus.BAD_REQUEST);
    }

    // Check if the users are already friends
    const requester = await this.userModel.findById(requesterId);
    if (requester && requester.friends && requester.friends.includes(recipientUser._id)) {
      throw new HttpException('User is already your friend.', HttpStatus.BAD_REQUEST);
    }

    const friendRequest = new this.friendRequestModel({
      requester: requesterId,
      recipient: recipientUser._id,
    });
    await friendRequest.save();

    // Emit a WebSocket event to notify the recipient
    this.friendsGateway.notifyFriendRequest(recipientUser._id.toString(), {
      requestId: friendRequest._id,
      from: requesterId,
    });

    return { message: 'Friend request sent successfully.' };
  }

  /**
   * Accepts a friend request.
   * @param recipientId - The ID of the user accepting the request.
   * @param requestId - The ID of the friend request.
   */
  async acceptFriendRequest(recipientId: string, requestId: string): Promise<{ message: string }> {
    const friendRequest = await this.friendRequestModel.findById(requestId);
    if (!friendRequest) {
      throw new HttpException('Friend request not found.', HttpStatus.NOT_FOUND);
    }
    if (friendRequest.recipient.toString() !== recipientId) {
      throw new HttpException('You are not authorized to accept this friend request.', HttpStatus.FORBIDDEN);
    }
    // Add each user to the other’s friend list.
    await this.userModel.findByIdAndUpdate(recipientId, { $addToSet: { friends: friendRequest.requester } });
    await this.userModel.findByIdAndUpdate(friendRequest.requester, { $addToSet: { friends: recipientId } });
    await friendRequest.deleteOne();
    return { message: 'Friend request accepted.' };
  }

  /**
   * Declines a friend request.
   * @param recipientId - The ID of the user declining the request.
   * @param requestId - The ID of the friend request.
   */
  async declineFriendRequest(recipientId: string, requestId: string): Promise<{ message: string }> {
    const friendRequest = await this.friendRequestModel.findById(requestId);
    if (!friendRequest) {
      throw new HttpException('Friend request not found.', HttpStatus.NOT_FOUND);
    }
    if (friendRequest.recipient.toString() !== recipientId) {
      throw new HttpException('You are not authorized to decline this friend request.', HttpStatus.FORBIDDEN);
    }
    await friendRequest.deleteOne();
    return { message: 'Friend request declined.' };
  }

  /**
   * Revokes a friend request.
   * @param requesterId - The ID of the user revoking the request.
   * @param requestId - The ID of the friend request.
   */
  async revokeFriendRequest(requesterId: string, requestId: string): Promise<{ message: string }> {
    const friendRequest = await this.friendRequestModel.findById(requestId);
    if (!friendRequest) {
      throw new HttpException('Friend request not found.', HttpStatus.NOT_FOUND);
    }
    if (friendRequest.requester.toString() !== requesterId) {
      throw new HttpException('You are not authorized to revoke this friend request.', HttpStatus.FORBIDDEN);
    }
    await friendRequest.deleteOne();
    return { message: 'Friend request revoked.' };
  }

  /**
   * Removes a friend from the user's friend list.
   * @param userId - The ID of the user.
   * @param friendId - The ID of the friend to remove.
   */
  async removeFriend(userId: string, friendId: string): Promise<{ message: string }> {
    await this.userModel.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await this.userModel.findByIdAndUpdate(friendId, { $pull: { friends: userId } });
    return { message: 'Friend removed successfully.' };
  }

  /**
   * Retrieves all incoming friend requests for the user.
   * @param userId - The ID of the user.
   */
  async getFriendRequests(userId: string): Promise<{ friendRequests: any }> {
    const requests = await this.friendRequestModel.find({ recipient: userId })
      .populate('requester', 'username email');
    return { friendRequests: requests };
  }

  /**
   * Retrieves the friend list for the user.
   * @param userId - The ID of the user.
   */
  async getFriendList(userId: string): Promise<{ friends: any }> {
    const user = await this.userModel.findById(userId).populate('friends', 'username email');
    if (!user) {
      throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
    }
    return { friends: user.friends };
  }
}
