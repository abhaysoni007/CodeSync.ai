import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  joinCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'editor', 'viewer'],
      default: 'viewer'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowJoinRequests: {
      type: Boolean,
      default: false
    },
    defaultFileTemplate: {
      type: String,
      default: ''
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  isArchived: {
    type: Boolean,
    default: false
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
projectSchema.index({ ownerId: 1, isArchived: 1 });
projectSchema.index({ 'members.userId': 1 });

// Generate unique join code
projectSchema.statics.generateJoinCode = async function() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const existing = await this.findOne({ joinCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
};

const Project = mongoose.model('Project', projectSchema);

export default Project;
