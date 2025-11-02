import mongoose from 'mongoose';

const userAPIKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    required: true,
    enum: ['google'], // Only Gemini
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  keyHash: {
    type: String,
    required: true,
    unique: true
  },
  encryptedKey: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    required: true
  },
  authTag: {
    type: String,
    required: true
  },
  lastUsed: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin']
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for quick lookups
userAPIKeySchema.index({ keyHash: 1, isActive: 1 });
userAPIKeySchema.index({ userId: 1, isActive: 1 });
userAPIKeySchema.index({ userId: 1, provider: 1 });

const UserAPIKey = mongoose.model('UserAPIKey', userAPIKeySchema);

export default UserAPIKey;
