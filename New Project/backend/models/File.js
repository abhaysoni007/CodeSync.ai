import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  path: {
    type: String,
    required: true,
    trim: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
    index: true
  },
  content: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'plaintext'
  },
  size: {
    type: Number,
    default: 0
  },
  extension: {
    type: String,
    trim: true
  },
  isDirectory: {
    type: Boolean,
    default: false
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  metadata: {
    encoding: {
      type: String,
      default: 'utf-8'
    },
    mimeType: {
      type: String,
      default: 'text/plain'
    },
    lineCount: {
      type: Number,
      default: 0
    }
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
fileSchema.index({ projectId: 1, isDeleted: 1 });
fileSchema.index({ roomId: 1, isDeleted: 1 });
fileSchema.index({ parentId: 1 });
fileSchema.index({ path: 1, projectId: 1 }, { unique: true });

const File = mongoose.model('File', fileSchema);

export default File;
