import { Controller, Post, Get, Body, Req, HttpException, HttpStatus, Param } from '@nestjs/common';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateChannelDto } from './dto/create-channel.dto';

/**
 * Controller for managing chat channels and messages.
 */
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Create or retrieve a direct channel between the current user and another user.
   */
  @Post('channel')
  async createOrGetChannel(
    @Req() req: Request,
    @Body() createChannelDto: CreateChannelDto,
  ) {
    const userId = req.session?.userId;
    if (!userId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.chatService.createOrGetDirectChannel(userId, createChannelDto.recipientId);
  }

  /**
   * Send a message in a channel.
   */
  @Post('message')
  async sendMessage(
    @Req() req: Request,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    const userId = req.session?.userId;
    if (!userId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.chatService.sendMessage(userId, sendMessageDto.channelId, sendMessageDto.content);
  }

  /**
   * Retrieve all messages for a channel.
   */
  @Get('channel/:channelId/messages')
  async getMessages(@Req() req: Request, @Param('channelId') channelId: string) {
    const userId = req.session?.userId;
    if (!userId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
    }
    return this.chatService.getMessages(channelId);
  }
}
