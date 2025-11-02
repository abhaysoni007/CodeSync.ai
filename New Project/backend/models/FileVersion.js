import mongoose from 'mongoose';

const fileVersionSchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
    index: true
  },
  versionNumber: {
    type: Number,
    required: true,
    min: 1
  },
  content: {
    type: String,
    required: true
  },
  contentHash: {
    type: String,
    required: true
  },
  diff: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true,
    default: 'Auto-saved version'
  },
  size: {
    type: Number,
    default: 0
  },
  isAutoSave: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    linesAdded: {
      type: Number,
      default: 0
    },
    linesRemoved: {
      type: Number,
      default: 0
    },
    charactersAdded: {
      type: Number,
      default: 0
    },
    charactersRemoved: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for versioning
fileVersionSchema.index({ fileId: 1, versionNumber: 1 }, { unique: true });
fileVersionSchema.index({ fileId: 1, createdAt: -1 });
fileVersionSchema.index({ createdBy: 1 });

const FileVersion = mongoose.model('FileVersion', fileVersionSchema);

export default FileVersion;
