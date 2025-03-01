import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';
import { FriendsGateway } from './friends.gateway';
import { FriendRequestSchema } from './schemas/friend-request.schema';
import { UserSchema } from '../auth/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FriendRequest', schema: FriendRequestSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [FriendsController],
  providers: [FriendsService, FriendsGateway],
  exports: [FriendsService],
})
export class FriendsModule {}
