import mongoose from 'mongoose';

/**
 * DeltaSnapshot Model
 * Stores compressed delta snapshots for efficient version control
 */
const deltaSnapshotSchema = new mongoose.Schema({
  snapshotId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Delta content (compressed patch)
  delta: {
    type: String,
    required: true,
    // Store compressed delta patches
    default: ''
  },
  
  // Base version this delta is based on
  baseVersion: {
    type: String,
    default: null,
    index: true
  },
  
  // Content checksum for integrity verification
  checksum: {
    type: String,
    required: true,
    index: true
  },
  
  // Snapshot metadata
  metadata: {
    linesAdded: { type: Number, default: 0 },
    linesRemoved: { type: Number, default: 0 },
    charsAdded: { type: Number, default: 0 },
    charsRemoved: { type: Number, default: 0 },
    deltaSize: { type: Number, default: 0 }, // Size in bytes
    compressed: { type: Boolean, default: false },
    compressionRatio: { type: Number, default: 1.0 }
  },
  
  // Trigger information
  trigger: {
    type: {
      type: String,
      enum: ['auto_save', 'idle', 'focus_loss', 'manual', 'cursor_jump', 'undo_redo', 'time_interval'],
      default: 'auto_save'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  
  // Full content snapshot (stored periodically for faster rollback)
  fullSnapshot: {
    type: String,
    default: null
  },
  
  // Indicates this is a checkpoint (full snapshot)
  isCheckpoint: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Version number for this file
  versionNumber: {
    type: Number,
    required: true,
    min: 1
  },
  
  // User message/description
  message: {
    type: String,
    trim: true,
    default: 'Auto-saved snapshot'
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true
  }],
  
  // Collaboration info
  collaborators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    contribution: {
      type: Number, // Percentage of changes
      default: 0
    }
  }],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    index: true
  },
  
  // Expiry for auto-cleanup
  expiresAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
deltaSnapshotSchema.index({ projectId: 1, fileId: 1, versionNumber: -1 });
deltaSnapshotSchema.index({ fileId: 1, createdAt: -1 });
deltaSnapshotSchema.index({ userId: 1, createdAt: -1 });
deltaSnapshotSchema.index({ checksum: 1 });
deltaSnapshotSchema.index({ baseVersion: 1 });
deltaSnapshotSchema.index({ isCheckpoint: 1, createdAt: -1 });
deltaSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for age
deltaSnapshotSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Method to check if snapshot should be compressed
deltaSnapshotSchema.methods.shouldCompress = function() {
  const AGE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
  return this.age > AGE_THRESHOLD && !this.metadata.compressed;
};

// Method to mark as checkpoint
deltaSnapshotSchema.methods.markAsCheckpoint = async function(fullContent) {
  this.isCheckpoint = true;
  this.fullSnapshot = fullContent;
  return this.save();
};

// Static method to get latest checkpoint
deltaSnapshotSchema.statics.getLatestCheckpoint = async function(fileId) {
  return this.findOne({
    fileId,
    isCheckpoint: true,
    status: 'active'
  }).sort({ createdAt: -1 });
};

// Static method to get deltas since version
deltaSnapshotSchema.statics.getDeltasSince = async function(fileId, baseVersion) {
  return this.find({
    fileId,
    versionNumber: { $gt: baseVersion },
    status: 'active'
  }).sort({ versionNumber: 1 });
};

// Static method to cleanup old deltas
deltaSnapshotSchema.statics.cleanupOldDeltas = async function(fileId, keepCount = 100) {
  const snapshots = await this.find({ fileId, status: 'active' })
    .sort({ createdAt: -1 })
    .skip(keepCount);
  
  const idsToArchive = snapshots.map(s => s._id);
  
  if (idsToArchive.length > 0) {
    await this.updateMany(
      { _id: { $in: idsToArchive } },
      { status: 'archived', expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // 30 days
    );
  }
  
  return idsToArchive.length;
};

const DeltaSnapshot = mongoose.model('DeltaSnapshot', deltaSnapshotSchema);

export default DeltaSnapshot;
