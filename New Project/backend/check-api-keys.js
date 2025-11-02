import mongoose from 'mongoose';
import UserAPIKey from './models/UserAPIKey.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://hackerabhay007_db_user:Abh%40y%24oni007@cluster0.qwqlkbg.mongodb.net/collaborative-editor';

async function checkAPIKeys() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all active API keys
    const allKeys = await UserAPIKey.find({ isActive: true });
    console.log(`📊 Total active API keys: ${allKeys.length}\n`);

    // Group by provider
    const byProvider = {};
    allKeys.forEach(key => {
      if (!byProvider[key.provider]) {
        byProvider[key.provider] = 0;
      }
      byProvider[key.provider]++;
    });

    console.log('📈 API Keys by Provider:');
    Object.entries(byProvider).forEach(([provider, count]) => {
      console.log(`  - ${provider}: ${count}`);
    });

    // Show Google/Gemini keys specifically
    console.log('\n🔍 Gemini (Google) API Keys:');
    const geminiKeys = await UserAPIKey.find({ 
      provider: 'google', 
      isActive: true 
    });

    if (geminiKeys.length === 0) {
      console.log('  ❌ No Gemini API keys found!');
      console.log('  💡 Make sure to save your Gemini API key in Profile Settings');
    } else {
      geminiKeys.forEach((key, index) => {
        console.log(`\n  Key ${index + 1}:`);
        console.log(`    User ID: ${key.userId}`);
        console.log(`    Provider: ${key.provider}`);
        console.log(`    Name: ${key.name}`);
        console.log(`    Active: ${key.isActive}`);
        console.log(`    Last Used: ${key.lastUsed || 'Never'}`);
        console.log(`    Created: ${key.createdAt}`);
      });
    }

    // Show all users with API keys
    console.log('\n👥 Users with API Keys:');
    const uniqueUsers = [...new Set(allKeys.map(k => k.userId.toString()))];
    console.log(`  Total: ${uniqueUsers.length} user(s)`);

    await mongoose.disconnect();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAPIKeys();
