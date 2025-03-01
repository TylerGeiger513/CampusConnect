import { Document, Types } from 'mongoose';

/**
 * Interface for a Friend Request document.
 */
export interface FriendRequest extends Document {
  requester: Types.ObjectId;
  recipient: Types.ObjectId;
  createdAt: Date;
}
