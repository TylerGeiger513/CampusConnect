import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict origins as needed for security
  },
})
export class FriendsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FriendsGateway.name);

  /**
   * Handle user joining their personal room.
   * Clients should emit a 'join' event with their userId to join their room.
   * @param userData - Object containing the user's ID.
   * @param client - The connected socket.
   */
  @SubscribeMessage('join')
  handleJoin(@MessageBody() userData: { userId: string }, @ConnectedSocket() client: Socket) {
    client.join(userData.userId);
    this.logger.log(`Socket ${client.id} joined room ${userData.userId}`);
  }

  /**
   * Notify a user of a new friend request via WebSocket.
   * @param recipientId - The ID of the recipient user.
   * @param data - Data related to the friend request.
   */
  notifyFriendRequest(recipientId: string, data: any) {
    this.server.to(recipientId).emit('friendRequest', data);
    this.logger.log(`Notified user ${recipientId} of a new friend request.`);
  }
}
