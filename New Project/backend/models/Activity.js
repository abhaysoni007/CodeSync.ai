import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'user_joined',
      'user_left',
      'file_created',
      'file_edited',
      'file_deleted',
      'file_renamed',
      'chat_message',
      'project_created',
      'project_updated',
      'member_added',
      'member_removed',
      'ai_interaction'
    ],
    required: true
  },
  action: {
    type: String,
    required: true
  },
  metadata: {
    fileName: String,
    fileId: mongoose.Schema.Types.ObjectId,
    oldName: String,
    newName: String,
    message: String,
    changesCount: Number,
    aiProvider: String,
    memberName: String,
    memberId: mongoose.Schema.Types.ObjectId
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
activitySchema.index({ projectId: 1, timestamp: -1 });
activitySchema.index({ userId: 1, timestamp: -1 });

// Helper method to create activity
activitySchema.statics.logActivity = async function(data) {
  try {
    const activity = new this(data);
    await activity.save();
    return activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
