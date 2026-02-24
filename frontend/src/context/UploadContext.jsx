import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * @typedef {import('../types/upload').SelectedFile} SelectedFile
 * @typedef {import('../types/upload').UploadProgress} UploadProgress
 * @typedef {import('../types/upload').UploadState} UploadState
 */

const UploadContext = createContext(null);

/**
 * Generates a unique ID for files and sessions
 * @returns {string} UUID v4 string
 */
function generateId() {
  return crypto.randomUUID();
}

/**
 * Provider component for upload state management
 * Manages the state for image selection, compression, and upload operations
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function UploadProvider({ children }) {
  // Selected files with their metadata and state
  const [selectedFiles, setSelectedFiles] = useState([]);
  
  // Map of file IDs to preview URLs (object URLs for thumbnails)
  const [previewUrls, setPreviewUrls] = useState(new Map());
  
  // Map of file IDs to upload progress information
  const [uploadProgress, setUploadProgress] = useState(new Map());
  
  // Whether an upload operation is currently in progress
  const [isUploading, setIsUploading] = useState(false);
  
  // Current error message, if any
  const [error, setError] = useState(null);
  
  // Current session ID
  const [sessionId, setSessionId] = useState(null);

  /**
   * Adds files to the selection
   * Creates preview URLs and initializes file state
   * 
   * @param {File[]} files - Array of File objects to add
   */
  const addFiles = useCallback((files) => {
    const newFiles = files.map(file => {
      const fileId = generateId();
      const previewUrl = URL.createObjectURL(file);
      
      // Store preview URL in map
      setPreviewUrls(prev => new Map(prev).set(fileId, previewUrl));
      
      return {
        id: fileId,
        file,
        previewUrl,
        originalSize: file.size,
        uploadProgress: 0,
        status: 'selected'
      };
    });
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    
    // Create new session if this is the first file selection
    if (!sessionId) {
      setSessionId(generateId());
    }
  }, [sessionId]);

  /**
   * Removes a file from the selection
   * Cleans up the preview URL to prevent memory leaks
   * 
   * @param {string} fileId - ID of the file to remove
   */
  const removeFile = useCallback((fileId) => {
    // Revoke object URL to free memory
    const previewUrl = previewUrls.get(fileId);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    setPreviewUrls(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
    setUploadProgress(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, [previewUrls]);

  /**
   * Clears all selected files and resets state
   * Cleans up all preview URLs
   */
  const clearFiles = useCallback(() => {
    // Revoke all object URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    
    setSelectedFiles([]);
    setPreviewUrls(new Map());
    setUploadProgress(new Map());
    setError(null);
    setSessionId(null);
  }, [previewUrls]);

  /**
   * Updates the progress for a specific file
   * 
   * @param {string} fileId - ID of the file
   * @param {UploadProgress} progress - Progress information
   */
  const updateProgress = useCallback((fileId, progress) => {
    setUploadProgress(prev => new Map(prev).set(fileId, progress));
    
    // Update the file's status and progress in selectedFiles
    setSelectedFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { 
            ...file, 
            uploadProgress: progress.progress,
            status: progress.status === 'complete' ? 'uploaded' : 
                   progress.status === 'error' ? 'error' :
                   progress.status === 'compressing' ? 'compressing' :
                   progress.status === 'uploading' ? 'uploading' : file.status,
            error: progress.errorMessage
          }
        : file
    ));
  }, []);

  /**
   * Updates a file's metadata after compression
   * 
   * @param {string} fileId - ID of the file
   * @param {number} compressedSize - Size of compressed file in bytes
   * @param {Blob} compressedBlob - The compressed blob
   */
  const updateCompressedFile = useCallback((fileId, compressedSize, compressedBlob) => {
    setSelectedFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { 
            ...file, 
            compressedSize,
            compressionRatio: compressedSize / file.originalSize,
            status: 'compressed',
            compressedBlob // Store the compressed blob for upload
          }
        : file
    ));
  }, []);

  /**
   * Updates a file's image path after successful upload
   * 
   * @param {string} fileId - ID of the file
   * @param {string} imagePath - Supabase storage path
   */
  const updateImagePath = useCallback((fileId, imagePath) => {
    setSelectedFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, imagePath, status: 'uploaded' }
        : file
    ));
  }, []);

  /**
   * Sets the error state
   * 
   * @param {string | null} errorMessage - Error message or null to clear
   */
  const setErrorMessage = useCallback((errorMessage) => {
    setError(errorMessage);
  }, []);

  const value = {
    // State
    selectedFiles,
    previewUrls,
    uploadProgress,
    isUploading,
    error,
    sessionId,
    
    // Actions
    addFiles,
    removeFile,
    clearFiles,
    updateProgress,
    updateCompressedFile,
    updateImagePath,
    setIsUploading,
    setError: setErrorMessage
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
}

/**
 * Hook to access upload context
 * Must be used within an UploadProvider
 * 
 * @returns {Object} Upload context value
 */
export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
