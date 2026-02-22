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
