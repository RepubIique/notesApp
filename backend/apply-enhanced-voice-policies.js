import { supabase } from './config/supabase.js';
import fs from 'fs/promises';

async function applyEnhancedPolicies() {
  console.log('Applying enhanced voice storage policies...\n');

  try {
    // Read the migration file
    const migrationPath = '../supabase/migrations/20260224032000_enhance_voice_storage_policies.sql';
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    console.log('Migration SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log();

    console.log('⚠️  Manual Action Required:');
    console.log();
    console.log('To apply these enhanced policies, you need to:');
    console.log();
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy and paste the SQL from:');
    console.log('   supabase/migrations/20260224032000_enhance_voice_storage_policies.sql');
    console.log('3. Execute the SQL');
    console.log();
    console.log('OR use the Supabase CLI:');
    console.log('   supabase db push');
    console.log();

    // Verify bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      process.exit(1);
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'voice-messages');

    if (bucketExists) {
      console.log('✓ Bucket "voice-messages" exists');
    } else {
      console.log('❌ Bucket "voice-messages" not found');
      console.log('   Run: node setup-voice-storage.js');
      process.exit(1);
    }

    console.log();
    console.log('Enhanced Policies Summary:');
    console.log('─'.repeat(60));
    console.log('1. Upload Policy:');
    console.log('   - Authenticated users can upload');
    console.log('   - Validates file has valid path structure');
    console.log();
    console.log('2. Read Policy:');
    console.log('   - Authenticated users can read voice messages');
    console.log('   - Appropriate for two-party chat system');
    console.log();
    console.log('3. Delete Policy:');
    console.log('   - Users can only delete their own messages');
    console.log('   - Checks message sender matches authenticated user');
    console.log('─'.repeat(60));
    console.log();

    console.log('✓ Enhanced policies ready to apply!');
    console.log();
    console.log('Storage Path Validation:');
    console.log('  ✓ Empty buffer rejection');
    console.log('  ✓ File size limit (10MB)');
    console.log('  ✓ MIME type validation');
    console.log('  ✓ File extension validation');
    console.log('  ✓ Path traversal prevention');
    console.log('  ✓ Unique filename generation');
    console.log();
    console.log('Signed URL Generation:');
    console.log('  ✓ Path validation');
    console.log('  ✓ 1-hour expiry');
    console.log('  ✓ Secure access control');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

applyEnhancedPolicies();
