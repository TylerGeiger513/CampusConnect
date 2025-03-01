import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatGateway } from './chat.gateway';

/**
 * ChatService handles creation/retrieval of channels and messages.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel('Channel') private readonly channelModel: Model<any>,
    @InjectModel('Message') private readonly messageModel: Model<any>,
    @InjectModel('User') private readonly userModel: Model<any>,
    private readonly chatGateway: ChatGateway,
  ) {}

  /**
   * Creates a direct channel between two users if it does not exist, or returns the existing channel.
   * @param userId The ID of the current user.
   * @param recipientId The ID of the other user.
   */
  async createOrGetDirectChannel(userId: string, recipientId: string): Promise<any> {
    // Ensure the users are different.
    if (userId === recipientId) {
      throw new HttpException('Cannot create a channel with yourself', HttpStatus.BAD_REQUEST);
    }
    // Check that recipient exists.
    const recipient = await this.userModel.findById(recipientId);
    if (!recipient) {
      throw new HttpException('Recipient user not found.', HttpStatus.NOT_FOUND);
    }
    // Look for an existing direct channel with exactly these two participants.
    let channel = await this.channelModel.findOne({
      type: 'direct',
      participants: { $all: [userId, recipientId], $size: 2 },
    });
    if (!channel) {
      channel = new this.channelModel({
        type: 'direct',
        participants: [userId, recipientId],
      });
      await channel.save();
    }
    return channel;
  }

  /**
   * Sends a message in the specified channel.
   * @param senderId The ID of the user sending the message.
   * @param channelId The ID of the channel.
   * @param content The message content.
   */
  async sendMessage(senderId: string, channelId: string, content: string): Promise<any> {
    // Check that the channel exists.
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    }
    // Check that the sender is a participant in the channel.
    if (!channel.participants.includes(senderId)) {
      throw new HttpException('Not authorized to send messages in this channel', HttpStatus.FORBIDDEN);
    }
    const message = new this.messageModel({
      channel: channelId,
      sender: senderId,
      content,
    });
    await message.save();

    // Emit the new message to all connected clients in the channel.
    this.chatGateway.notifyNewMessage(channelId, message);
    return { message: 'Message sent.', data: message };
  }

  /**
   * Retrieves all messages for a given channel, sorted chronologically.
   * @param channelId The channel ID.
   */
  async getMessages(channelId: string): Promise<any> {
    const messages = await this.messageModel.find({ channel: channelId }).sort({ createdAt: 1 });
    return { messages };
  }
}
