import { Document, Types } from 'mongoose';

export interface Message extends Document {
  channel: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
