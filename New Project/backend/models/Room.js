import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  maxMembers: {
    type: Number,
    default: 10,
    min: 2,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: null
  },
  settings: {
    allowAudio: {
      type: Boolean,
      default: true
    },
    allowVideo: {
      type: Boolean,
      default: true
    },
    allowScreenShare: {
      type: Boolean,
      default: true
    },
    allowChat: {
      type: Boolean,
      default: true
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    autoSaveInterval: {
      type: Number,
      default: 30 // seconds
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
roomSchema.index({ roomCode: 1, isActive: 1 });
roomSchema.index({ projectId: 1, isActive: 1 });
roomSchema.index({ creatorId: 1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;
