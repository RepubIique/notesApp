/**
 * @fileoverview Type definitions for image upload functionality
 * These types support the better-image-handling feature.
 */

/**
 * Status of an individual file in the upload pipeline
 * @typedef {'selected' | 'compressing' | 'compressed' | 'uploading' | 'uploaded' | 'error'} FileStatus
 */

/**
 * Represents a selected file with its metadata and processing state
 * @typedef {Object} SelectedFile
 * @property {string} id - Generated UUID for the file
 * @property {File} file - The original File object
 * @property {string} previewUrl - Object URL for thumbnail display
 * @property {number} originalSize - Original file size in bytes
 * @property {number} [compressedSize] - Compressed file size in bytes (if compression occurred)
 * @property {number} [compressionRatio] - Ratio of compressed to original size (0-1)
 * @property {number} uploadProgress - Upload progress percentage (0-100)
 * @property {FileStatus} status - Current status of the file
 * @property {string} [error] - Error message if status is 'error'
 * @property {string} [imagePath] - Supabase storage path after successful upload
 */

/**
 * Progress information for a single file upload
 * @typedef {Object} UploadProgress
 * @property {string} fileId - Unique identifier for the file
 * @property {string} fileName - Display name of the file
 * @property {number} progress - Upload progress percentage (0-100)
 * @property {'pending' | 'compressing' | 'uploading' | 'complete' | 'error'} status - Current upload status
 * @property {string} [errorMessage] - Error message if status is 'error'
 */

/**
 * Overall state of the upload session
 * @typedef {Object} UploadState
 * @property {string} sessionId - Unique ID for this upload session
 * @property {SelectedFile[]} files - Array of selected files with their state
 * @property {'selecting' | 'previewing' | 'compressing' | 'uploading' | 'complete' | 'error'} status - Overall upload status
 * @property {number} overallProgress - Average progress across all files (0-100)
 * @property {Date} createdAt - Timestamp when the upload session was created
 */

/**
 * Result of an upload operation
 * @typedef {Object} UploadResult
 * @property {string} fileId - Unique identifier for the file
 * @property {boolean} success - Whether the upload succeeded
 * @property {string} [imagePath] - Supabase storage path if successful
 * @property {string} [error] - Error message if upload failed
 */

/**
 * Metadata stored with each uploaded image
 * @typedef {Object} ImageMetadata
 * @property {string} originalFileName - Original name of the file
 * @property {number} originalSize - Original file size in bytes
 * @property {number} compressedSize - Compressed file size in bytes
 * @property {number} compressionRatio - Ratio of compressed to original size
 * @property {string} mimeType - MIME type of the image
 * @property {Object} dimensions - Image dimensions
 * @property {number} dimensions.width - Image width in pixels
 * @property {number} dimensions.height - Image height in pixels
 * @property {Date} uploadedAt - Timestamp when the image was uploaded
 */

// Export empty object to make this a module
export {};
