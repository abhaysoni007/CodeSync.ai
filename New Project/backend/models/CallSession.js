import mongoose from 'mongoose';

const callSessionSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  initiatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date,
      default: null
    },
    peerId: {
      type: String,
      default: null
    },
    stream: {
      audio: {
        type: Boolean,
        default: false
      },
      video: {
        type: Boolean,
        default: false
      },
      screen: {
        type: Boolean,
        default: false
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  type: {
    type: String,
    enum: ['audio', 'video', 'screen'],
    default: 'video'
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'ended'],
    default: 'waiting'
  },
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  quality: {
    bitrate: {
      type: Number,
      default: null
    },
    resolution: {
      type: String,
      default: null
    },
    frameRate: {
      type: Number,
      default: null
    }
  },
  recording: {
    isRecorded: {
      type: Boolean,
      default: false
    },
    recordingUrl: {
      type: String,
      default: null
    },
    recordingSize: {
      type: Number,
      default: null
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
callSessionSchema.index({ roomId: 1, status: 1 });
callSessionSchema.index({ initiatorId: 1 });
callSessionSchema.index({ 'participants.userId': 1 });
callSessionSchema.index({ createdAt: -1 });

const CallSession = mongoose.model('CallSession', callSessionSchema);

export default CallSession;
