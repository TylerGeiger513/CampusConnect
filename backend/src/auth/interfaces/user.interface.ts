import { Document, Types } from 'mongoose';

export interface User extends Document {
  readonly username: string;
  readonly email: string;
  password: string;
  friends?: string[];
  comparePassword(candidatePassword: string): Promise<boolean>;
  _id: Types.ObjectId;
}
