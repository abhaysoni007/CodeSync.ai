import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'code', 'file', 'system', 'notification'],
    default: 'text'
  },
  metadata: {
    language: {
      type: String,
      default: null
    },
    fileName: {
      type: String,
      default: null
    },
    fileUrl: {
      type: String,
      default: null
    },
    fileSize: {
      type: Number,
      default: null
    },
    codeBlock: {
      type: Boolean,
      default: false
    }
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ projectId: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ projectId: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, isDeleted: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
