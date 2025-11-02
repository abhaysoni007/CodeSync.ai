import mongoose from 'mongoose';

const roomMemberSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  socketId: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['host', 'moderator', 'participant'],
    default: 'participant'
  },
  permissions: {
    canEdit: {
      type: Boolean,
      default: true
    },
    canChat: {
      type: Boolean,
      default: true
    },
    canAudio: {
      type: Boolean,
      default: true
    },
    canVideo: {
      type: Boolean,
      default: true
    },
    canScreenShare: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  cursorPosition: {
    line: { type: Number, default: 0 },
    column: { type: Number, default: 0 },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null
    }
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes
roomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });
roomMemberSchema.index({ roomId: 1, isActive: 1 });
roomMemberSchema.index({ userId: 1, isActive: 1 });

const RoomMember = mongoose.model('RoomMember', roomMemberSchema);

export default RoomMember;
