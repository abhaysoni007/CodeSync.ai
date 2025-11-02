import mongoose from 'mongoose';
import UserAPIKey from './models/UserAPIKey.js';

const MONGO_URI = 'mongodb+srv://hackerabhay007_db_user:Abh%40y%24oni007@cluster0.qwqlkbg.mongodb.net/collaborative-editor?retryWrites=true&w=majority&appName=Cluster0';

async function debugAPIKeys() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all API keys
    const keys = await UserAPIKey.find({});
    
    console.log(`📊 Found ${keys.length} API key(s) in database:\n`);
    
    keys.forEach((key, index) => {
      console.log(`Key #${index + 1}:`);
      console.log(`  User ID: ${key.userId}`);
      console.log(`  Provider: ${key.provider}`);
      console.log(`  Active: ${key.isActive}`);
      console.log(`  Encrypted Key exists: ${!!key.encryptedKey}`);
      console.log(`  IV exists: ${!!key.iv}`);
      console.log(`  Auth Tag exists: ${!!key.authTag}`);
      console.log(`  Created: ${key.createdAt}`);
      console.log(`  Updated: ${key.updatedAt}`);
      console.log(`  Raw encryptedKey value: ${key.encryptedKey}`);
      console.log(`  Raw IV value: ${key.iv}`);
      console.log(`  Raw authTag value: ${key.authTag}`);
      console.log('');
    });

    // Now delete all keys
    console.log('🗑️ Deleting all API keys...');
    const result = await UserAPIKey.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} API key(s)`);
    
    await mongoose.connection.close();
    console.log('\n✅ Database cleaned! Now save your Gemini API key again in Profile settings.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugAPIKeys();
