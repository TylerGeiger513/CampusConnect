import * as mongoose from 'mongoose';

export const ChannelSchema = new mongoose.Schema(
  {
    // Type can be extended later to support group channels, classroom channels, etc.
    type: { type: String, enum: ['direct', 'group'], required: true, default: 'direct' },
    // List of participant user IDs.
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    // Optional channel name (for groups).
    name: { type: String, trim: true },
  },
  { timestamps: true },
);
