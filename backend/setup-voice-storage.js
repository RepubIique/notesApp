import { supabase } from './config/supabase.js';

async function setupVoiceStorage() {
  console.log('Setting up voice-messages storage bucket...');

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      process.exit(1);
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'voice-messages');

    if (bucketExists) {
      console.log('✓ Bucket "voice-messages" already exists');
      console.log('Updating bucket to support Safari/iOS audio formats...');
      
      // Note: Supabase doesn't support updating bucket config via API
      // You need to update it manually in the dashboard
      console.log('\n⚠️  Manual step required:');
      console.log('Go to Supabase Dashboard → Storage → voice-messages → Configuration');
      console.log('Add these MIME types to "Allowed MIME types":');
      console.log('  - audio/aac');
      console.log('  - audio/x-m4a');
      console.log('  - audio/m4a');
      console.log('(Keep existing: audio/webm, audio/ogg, audio/mp4, audio/mpeg, audio/wav)');
    } else {
      // Create the bucket with Safari/iOS support
      const { data, error } = await supabase.storage.createBucket('voice-messages', {
        public: false,
        fileSizeLimit: 10485760, // 10MB in bytes
        allowedMimeTypes: [
          'audio/webm',
          'audio/ogg',
          'audio/mp4',
          'audio/mpeg',
          'audio/wav',
          'audio/aac',
          'audio/x-m4a',
          'audio/m4a'
        ]
      });

      if (error) {
        console.error('Error creating bucket:', error);
        process.exit(1);
      }

      console.log('✓ Created bucket "voice-messages"');
    }

    console.log('\n✓ Voice storage setup complete!');
    console.log('\nNext steps:');
    console.log('1. Configure RLS policies in Supabase Dashboard → Storage → voice-messages');
    console.log('2. Add policies for authenticated users to upload, read, and delete');
    console.log('3. See backend/migrations/008_create_voice_messages_bucket.md for policy SQL');

  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

setupVoiceStorage();
