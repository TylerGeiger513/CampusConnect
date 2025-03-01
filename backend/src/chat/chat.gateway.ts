import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

/**
 * Gateway to handle WebSocket communications for the chat feature.
 */
@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict origins as needed.
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  /**
   * Allows a client to join a room for a specific channel.
   * Clients should emit a 'joinChannel' event with the channel ID.
   */
  @SubscribeMessage('joinChannel')
  handleJoinChannel(@MessageBody() data: { channelId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.channelId);
    this.logger.log(`Socket ${client.id} joined channel room ${data.channelId}`);
  }

  /**
   * Notifies all clients in a channel room of a new message.
   * @param channelId The channel room identifier.
   * @param message The message data.
   */
  notifyNewMessage(channelId: string, message: any) {
    this.server.to(channelId).emit('newMessage', message);
    this.logger.log(`Notified channel ${channelId} of new message`);
  }
}
