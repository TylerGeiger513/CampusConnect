import { Document, Types } from 'mongoose';

export interface Channel extends Document {
  type: 'direct' | 'group';
  participants: Types.ObjectId[];
  name?: string;
  createdAt: Date;
  updatedAt: Date;
}
