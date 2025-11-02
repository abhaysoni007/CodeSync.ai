import mongoose from 'mongoose';

const aiInteractionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
    index: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    default: null
  },
  type: {
    type: String,
    enum: ['completion', 'explanation', 'refactor', 'debug', 'generate', 'chat'],
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  context: {
    code: {
      type: String,
      default: null
    },
    language: {
      type: String,
      default: null
    },
    selection: {
      start: {
        line: Number,
        column: Number
      },
      end: {
        line: Number,
        column: Number
      }
    }
  },
  response: {
    type: String,
    required: true
  },
  model: {
    type: String,
    default: 'gpt-3.5-turbo'
  },
  tokensUsed: {
    prompt: {
      type: Number,
      default: 0
    },
    completion: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  latency: {
    type: Number, // in milliseconds
    default: 0
  },
  wasApplied: {
    type: Boolean,
    default: false
  },
  appliedAt: {
    type: Date,
    default: null
  },
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    comment: {
      type: String,
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
aiInteractionSchema.index({ userId: 1, createdAt: -1 });
aiInteractionSchema.index({ roomId: 1, createdAt: -1 });
aiInteractionSchema.index({ type: 1 });
aiInteractionSchema.index({ wasApplied: 1 });

const AIInteraction = mongoose.model('AIInteraction', aiInteractionSchema);

export default AIInteraction;
