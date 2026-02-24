import React, { useRef } from 'react';
import { IconButton, CircularProgress } from '@mui/material';
import { Image as ImageIcon } from '@mui/icons-material';
import { useUpload } from '../context/UploadContext';

/**
 * Supported image MIME types
 */
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Maximum number of files that can be selected at once
 */
const MAX_FILE_COUNT = 10;

/**
 * ImageUploadButton component
 * Handles file selection with validation for type, size, and count
 * 
 * @param {Object} props
 * @param {(files: File[]) => void} props.onFilesSelected - Callback when valid files are selected
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {number} [props.maxFiles=10] - Maximum number of files allowed
 */
function ImageUploadButton({ onFilesSelected, disabled = false, maxFiles = MAX_FILE_COUNT }) {
  const fileInputRef = useRef(null);
  const { isUploading } = useUpload();

  /**
   * Validates file type
   * @param {File} file
   * @returns {boolean}
   */
  const isValidFileType = (file) => {
    return VALID_IMAGE_TYPES.includes(file.type);
  };

  /**
   * Validates file size
   * @param {File} file
   * @returns {boolean}
   */
  const isValidFileSize = (file) => {
    return file.size <= MAX_FILE_SIZE;
  };

  /**
   * Formats file size for display
   * @param {number} bytes
   * @returns {string}
   */
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Handles file selection and validation
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file count
    if (files.length === 0) {
      return;
    }

    if (files.length > maxFiles) {
      alert(`Maximum ${maxFiles} images can be uploaded at once`);
      return;
    }

    // Validate file types
    const invalidTypeFiles = files.filter(file => !isValidFileType(file));
    if (invalidTypeFiles.length > 0) {
      alert('Only image files are allowed (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => !isValidFileSize(file));
    if (oversizedFiles.length > 0) {
      const fileList = oversizedFiles
        .map(f => `${f.name} (${formatFileSize(f.size)})`)
        .join('\n');
      alert(`The following images exceed the maximum size of ${formatFileSize(MAX_FILE_SIZE)}:\n\n${fileList}`);
      return;
    }

    // All validations passed
    onFilesSelected(files);
  };

  /**
   * Handles button click to trigger file input
   */
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={VALID_IMAGE_TYPES.join(',')}
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />
      
      {/* Image upload button */}
      <IconButton
        onClick={handleClick}
        disabled={disabled || isUploading}
        color="primary"
        title="Upload images"
      >
        {isUploading ? <CircularProgress size={24} /> : <ImageIcon />}
      </IconButton>
    </>
  );
}

export default ImageUploadButton;
