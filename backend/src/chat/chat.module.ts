import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { MessageSchema } from './schemas/message.schema';
import { ChannelSchema } from './schemas/channel.schema';
import { UserSchema } from '../auth/schemas/user.schema';

@Module({
  imports: [
    // Define the Message and Channel schemas; we also import User schema for population if needed.
    MongooseModule.forFeature([
      { name: 'Message', schema: MessageSchema },
      { name: 'Channel', schema: ChannelSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
