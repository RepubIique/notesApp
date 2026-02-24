/**
 * CompressionWorker - Web Worker for image compression
 * 
 * This worker handles image compression using browser-image-compression library
 * without blocking the main UI thread. It processes compression requests and
 * returns compressed blobs or falls back to original files when appropriate.
 * 
 * Requirements: 3.1, 3.2, 3.3, 8.1
 */

import imageCompression from 'browser-image-compression';

/**
 * Compression options configuration
 * - maxWidthOrHeight: 1920px (preserves aspect ratio)
 * - quality: 0.85 (good balance between size and quality)
 * - preserveExif: true (maintains orientation metadata)
 */
const DEFAULT_COMPRESSION_OPTIONS = {
  maxWidthOrHeight: 1920,
  initialQuality: 0.85,
  useWebWorker: false, // Already in a worker, no need for nested workers
  preserveExif: true,
};

/**
 * Handle incoming compression requests
 */
self.onmessage = async (event) => {
  const { type, fileId, file, options } = event.data;

  if (type !== 'compress') {
    self.postMessage({
      type: 'error',
      fileId,
      error: 'Unknown message type',
    });
    return;
  }

  try {
    const originalSize = file.size;
    
    // Merge provided options with defaults
    const compressionOptions = {
      ...DEFAULT_COMPRESSION_OPTIONS,
      ...options,
    };

    // Perform compression
    const compressedBlob = await imageCompression(file, compressionOptions);
    const compressedSize = compressedBlob.size;

    // Calculate compression ratio
    const compressionRatio = compressedSize / originalSize;

    // If compression didn't reduce size by at least 10%, use original
    // Requirement 3.5: Original used when compression ineffective
    if (compressionRatio > 0.9) {
      self.postMessage({
        type: 'success',
        fileId,
        compressedBlob: file, // Use original file
        originalSize,
        compressedSize: originalSize,
        usedOriginal: true,
        compressionRatio: 1.0,
      });
      return;
    }

    // Send successful compression result
    self.postMessage({
      type: 'success',
      fileId,
      compressedBlob,
      originalSize,
      compressedSize,
      usedOriginal: false,
      compressionRatio,
    });

  } catch (error) {
    // Requirement 7.2: Compression failure fallback
    // On error, fall back to original file
    self.postMessage({
      type: 'success',
      fileId,
      compressedBlob: file, // Use original file as fallback
      originalSize: file.size,
      compressedSize: file.size,
      usedOriginal: true,
      compressionRatio: 1.0,
      error: error.message || 'Compression failed, using original',
    });
  }
};
