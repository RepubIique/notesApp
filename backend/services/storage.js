import { supabase } from '../config/supabase.js';
import { randomUUID } from 'crypto';
import path from 'path';

// Upload image to Supabase Storage
export const uploadImage = async (image, fileName, mimeType) => {
  // Validate MIME type is image/*
  if (!mimeType || !mimeType.startsWith('image/')) {
    throw new Error('Only image files are allowed (jpeg, png, gif, webp)');
  }

  // Generate unique file path (uuid + extension)
  const extension = path.extname(fileName);
  const uniqueFileName = `${randomUUID()}${extension}`;

  // Upload to Supabase Storage 'images' bucket
  const { data, error } = await supabase.storage
    .from('images')
    .upload(uniqueFileName, image, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  // Return image path
  return data.path;
};

// Create image message in database
export const createImageMessage = async (sender, imagePath, imageName, imageMime) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender,
      type: 'image',
      image_path: imagePath,
      image_name: imageName,
      image_mime: imageMime,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create image message: ${error.message}`);
  }

  return data;
};

// Get signed URL for image
export const getImageUrl = async (imagePath) => {
  // Create signed URL for image with 1 hour expiry
  const { data, error } = await supabase.storage
    .from('images')
    .createSignedUrl(imagePath, 3600); // 3600 seconds = 1 hour

  if (error) {
    throw new Error(`Failed to generate image URL: ${error.message}`);
  }

  // Return signed URL
  return data.signedUrl;
};

// Upload voice message to Supabase Storage
export const uploadVoiceMessage = async (audioBuffer, fileName, mimeType) => {
  // Validate MIME type is audio/*
  const validAudioTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
  if (!mimeType || !validAudioTypes.includes(mimeType)) {
    throw new Error('Only audio files are allowed (webm, ogg, mp4, mpeg, wav)');
  }

  // Validate audio buffer
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('Audio buffer is empty');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (audioBuffer.length > maxSize) {
    throw new Error('Audio file exceeds 10MB limit');
  }

  // Validate and sanitize file extension
  const extension = path.extname(fileName) || '.webm';
  const allowedExtensions = ['.webm', '.ogg', '.mp4', '.mpeg', '.mp3', '.wav'];
  if (!allowedExtensions.includes(extension.toLowerCase())) {
    throw new Error('Invalid audio file extension');
  }

  // Generate unique file path with timestamp for collision prevention
  // Format: {uuid}_{timestamp}{extension}
  const uniqueFileName = `${randomUUID()}_${Date.now()}${extension}`;

  // Validate generated filename doesn't contain path traversal
  if (uniqueFileName.includes('..') || uniqueFileName.includes('/')) {
    throw new Error('Invalid filename generated');
  }

  // Upload to Supabase Storage 'voice-messages' bucket
  const { data, error } = await supabase.storage
    .from('voice-messages')
    .upload(uniqueFileName, audioBuffer, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    throw new Error(`Voice message upload failed: ${error.message}`);
  }

  // Return audio path
  return data.path;
};

// Create voice message in database
export const createVoiceMessage = async (sender, audioPath, audioDuration) => {
  // Validate required metadata fields (Requirement 5.1)
  if (!sender || (sender !== 'A' && sender !== 'B')) {
    throw new Error('Invalid sender: must be A or B');
  }
  
  if (!audioPath || typeof audioPath !== 'string') {
    throw new Error('Invalid audio path');
  }
  
  if (!audioDuration || typeof audioDuration !== 'number' || audioDuration <= 0) {
    throw new Error('Invalid audio duration');
  }

  // Create voice message with consistent metadata (Requirement 5.1)
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender,                                    // Standard metadata: sender
      type: 'voice',                            // Message type
      audio_path: audioPath,                    // Voice-specific: audio file path
      audio_duration: audioDuration,            // Voice-specific: duration in seconds
      created_at: new Date().toISOString(),     // Standard metadata: timestamp
      deleted: false                            // Standard metadata: deletion flag
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create voice message: ${error.message}`);
  }

  // Verify all required metadata is present in response
  if (!data.id || !data.sender || !data.created_at) {
    throw new Error('Voice message created but missing required metadata');
  }

  return data;
};

// Get signed URL for voice message
export const getVoiceMessageUrl = async (audioPath) => {
  // Validate audio path
  if (!audioPath || typeof audioPath !== 'string') {
    throw new Error('Invalid audio path');
  }

  // Validate path doesn't contain path traversal attempts
  if (audioPath.includes('..') || audioPath.startsWith('/')) {
    throw new Error('Invalid audio path format');
  }

  // Create signed URL for audio with 1 hour expiry
  const { data, error } = await supabase.storage
    .from('voice-messages')
    .createSignedUrl(audioPath, 3600); // 3600 seconds = 1 hour

  if (error) {
    throw new Error(`Failed to generate voice message URL: ${error.message}`);
  }

  // Validate signed URL was generated
  if (!data || !data.signedUrl) {
    throw new Error('Failed to generate voice message URL');
  }

  // Return signed URL
  return data.signedUrl;
};

// Delete voice message file from storage
export const deleteVoiceMessageFile = async (audioPath) => {
  // Validate audio path
  if (!audioPath || typeof audioPath !== 'string') {
    throw new Error('Invalid audio path');
  }

  // Validate path doesn't contain path traversal attempts
  if (audioPath.includes('..') || audioPath.startsWith('/')) {
    throw new Error('Invalid audio path format');
  }

  // Delete from storage
  const { error } = await supabase.storage
    .from('voice-messages')
    .remove([audioPath]);

  if (error) {
    throw new Error(`Failed to delete voice message file: ${error.message}`);
  }

  return true;
};
