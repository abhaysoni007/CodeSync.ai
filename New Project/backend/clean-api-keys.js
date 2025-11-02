import mongoose from 'mongoose';
import UserAPIKey from './models/UserAPIKey.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hackerabhay007_db_user:Abh%40y%24oni007@cluster0.qwqlkbg.mongodb.net/collaborative-editor';

async function cleanAPIKeys() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Delete all API keys
    const result = await UserAPIKey.deleteMany({});
    console.log(`🗑️  Deleted ${result.deletedCount} API key(s)\n`);

    console.log('✅ Database cleaned!');
    console.log('💡 Now go to Profile → API Keys and save your Gemini API key again.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanAPIKeys();
