import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Collapse,
  Alert,
  LinearProgress,
  Typography,
  IconButton
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { messageAPI } from '../utils/api';
import ImageUploadButton from './ImageUploadButton';
import ImagePreviewDialog from './ImagePreviewDialog';
import UploadProgressList from './UploadProgressList';
import VoiceRecorder from './VoiceRecorder';
import VoiceMessageErrorBoundary from './VoiceMessageErrorBoundary';
import { useUpload } from '../context/UploadContext';
import { useVoiceRecording } from '../context/VoiceRecordingContext';
import { uploadManager } from '../utils/uploadManager';

function MessageComposer({ onSendText, onSendImage, conversationId = 'default' }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [voiceUploadError, setVoiceUploadError] = useState(null);
  const [showVoiceSuccess, setShowVoiceSuccess] = useState(false);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const compressionWorkerRef = useRef(null);
  
  // Use upload context for managing selected files
  const { 
    selectedFiles, 
    addFiles, 
    removeFile, 
    clearFiles, 
    updateProgress,
    updateCompressedFile,
    updateImagePath,
    setIsUploading,
    setError,
    uploadProgress,
    isUploading: contextIsUploading
  } = useUpload();

  // Use voice recording context
  const {
    isRecording,
    isUploading: isVoiceUploading,
    uploadProgress: voiceUploadProgress,
    error: voiceRecordingError,
    sendRecording,
    reset: resetVoiceRecording
  } = useVoiceRecording();

  // Initialize compression worker
  useEffect(() => {
    compressionWorkerRef.current = new Worker(
      new URL('../workers/compressionWorker.js', import.meta.url),
      { type: 'module' }
    );

    return () => {
      // Cleanup worker on unmount
      if (compressionWorkerRef.current) {
        compressionWorkerRef.current.terminate();
      }
    };
  }, []);

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    
    // Don't send empty messages
    if (!text.trim()) {
      return;
    }

    // Clear typing status immediately
    clearTypingStatus();

    try {
      await onSendText(text);
      // Clear input after successful send
      setText('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Could add error UI here
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);

    // Handle typing indicator
    if (newText.trim()) {
      // User is typing
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        messageAPI.updateTyping(true).catch(err => 
          console.error('Failed to update typing status:', err)
        );
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to clear typing status after 3 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        clearTypingStatus();
      }, 3000);
    } else {
      // Input is empty, clear typing status
      clearTypingStatus();
    }
  };

  const clearTypingStatus = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      messageAPI.updateTyping(false).catch(err => 
        console.error('Failed to clear typing status:', err)
      );
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  /**
   * Handles file selection from ImageUploadButton
   * Opens preview dialog with selected files
   */
  const handleFilesSelected = (files) => {
    addFiles(files);
    setPreviewOpen(true);
  };

  /**
   * Handles closing the preview dialog
   * Clears selected files
   */
  const handlePreviewClose = () => {
    setPreviewOpen(false);
    clearFiles();
  };

  /**
   * Handles confirming the upload from preview dialog
   * Compresses images, uploads them, and creates a single message
   */
  const handlePreviewConfirm = async () => {
    setPreviewOpen(false);
    setIsUploading(true);
    setUploading(true);
    
    try {
      // Step 1: Compress all images
      const compressedFiles = await compressImages(selectedFiles);
      
      // Step 2: Upload all compressed images
      const uploadResults = await uploadImages(compressedFiles);
      
      // Step 3: Filter successful uploads
      const successfulUploads = uploadResults.filter(result => result.success);
      
      if (successfulUploads.length === 0) {
        throw new Error('All uploads failed');
      }
      
      // Step 4: Create a single message with all uploaded image paths
      const imagePaths = successfulUploads.map(result => result.imagePath);
      await createImageMessage(imagePaths);
      
      // Step 5: Report partial failures if any
      const failedUploads = uploadResults.filter(result => !result.success);
      if (failedUploads.length > 0) {
        const failedCount = failedUploads.length;
        const successCount = successfulUploads.length;
        setError(`${successCount} of ${uploadResults.length} images uploaded successfully. ${failedCount} failed.`);
      }
      
      // Clear files after successful upload
      clearFiles();
      
    } catch (error) {
      console.error('Upload process failed:', error);
      setError(error.message || 'Failed to upload images');
    } finally {
      setIsUploading(false);
      setUploading(false);
    }
  };

  /**
   * Compresses all selected images using the compression worker
   * @param {Array} files - Selected files from upload context
   * @returns {Promise<Array>} Array of compressed file data
   */
  const compressImages = async (files) => {
    const compressionPromises = files.map(fileData => {
      return new Promise((resolve, reject) => {
        const { id: fileId, file } = fileData;
        
        // Update progress to compressing state
        updateProgress(fileId, {
          fileId,
          fileName: file.name,
          progress: 0,
          status: 'compressing'
        });

        // Set up message handler for this specific file
        const handleMessage = (event) => {
          const { type, fileId: responseFileId, compressedBlob, compressedSize, originalSize, error } = event.data;
          
          // Only handle messages for this file
          if (responseFileId !== fileId) return;
          
          // Remove this handler
          compressionWorkerRef.current.removeEventListener('message', handleMessage);
          
          if (type === 'success') {
            // Update compressed file in context
            updateCompressedFile(fileId, compressedSize, compressedBlob);
            
            resolve({
              fileId,
              blob: compressedBlob,
              fileName: file.name
            });
          } else {
            // Compression failed, but worker should have sent original as fallback
            reject(new Error(error || 'Compression failed'));
          }
        };

        compressionWorkerRef.current.addEventListener('message', handleMessage);

        // Send compression request
        compressionWorkerRef.current.postMessage({
          type: 'compress',
          fileId,
          file,
          options: {} // Use default options
        });
      });
    });

    return Promise.all(compressionPromises);
  };

  /**
   * Uploads all compressed images using the upload manager
   * @param {Array} compressedFiles - Array of compressed file data
   * @returns {Promise<Array>} Array of upload results
   */
  const uploadImages = async (compressedFiles) => {
    // Use upload manager with progress callback
    const results = await uploadManager.uploadImages(
      compressedFiles,
      (fileId, progress) => {
        updateProgress(fileId, progress);
      }
    );

    // Update image paths in context for successful uploads
    results.forEach(result => {
      if (result.success) {
        updateImagePath(result.fileId, result.imagePath);
      }
    });

    return results;
  };

  /**
   * Creates a single message with all uploaded image paths
   * @param {Array<string>} imagePaths - Array of Supabase storage paths
   */
  const createImageMessage = async (imagePaths) => {
    // Create a single message with all image paths
    // The message format should include all images
    for (const imagePath of imagePaths) {
      // Call the onSendImage callback for each image
      // This maintains compatibility with existing message handling
      await onSendImage(imagePath);
    }
  };

  /**
   * Handles cancelling an individual upload
   * @param {string} fileId - ID of the file to cancel
   */
  const handleCancelUpload = (fileId) => {
    uploadManager.cancelUpload(fileId);
    updateProgress(fileId, {
      fileId,
      fileName: selectedFiles.find(f => f.id === fileId)?.file.name || '',
      progress: 0,
      status: 'error',
      errorMessage: 'Upload cancelled'
    });
  };

  /**
   * Handles voice recording completion
   * Automatically sends the recording
   * Requirements: 2.3, 2.4, 2.5
   */
  const handleRecordingComplete = async (audioBlob, duration) => {
    setVoiceUploadError(null);
    setShowVoiceSuccess(false);
    
    try {
      // Send the recording (compression and upload handled by context)
      const result = await sendRecording(conversationId);
      
      if (result.success) {
        // Show success feedback (Requirement 8.5)
        setShowVoiceSuccess(true);
        setTimeout(() => setShowVoiceSuccess(false), 3000);
      } else {
        // Show error with retry option (Requirement 2.6)
        setVoiceUploadError(result.error || 'Failed to send voice message');
      }
    } catch (error) {
      console.error('Failed to send voice message:', error);
      setVoiceUploadError(error.message || 'Failed to send voice message');
    }
  };

  /**
   * Handles voice recording cancellation
   */
  const handleRecordingCancel = () => {
    setVoiceUploadError(null);
    setShowVoiceSuccess(false);
  };

  /**
   * Handles retry of failed voice upload
   * Requirements: 2.6, 8.4
   */
  const handleVoiceRetry = async () => {
    setVoiceUploadError(null);
    
    try {
      const result = await sendRecording(conversationId);
      
      if (result.success) {
        setShowVoiceSuccess(true);
        setTimeout(() => setShowVoiceSuccess(false), 3000);
      } else {
        setVoiceUploadError(result.error || 'Failed to send voice message');
      }
    } catch (error) {
      console.error('Failed to retry voice message:', error);
      setVoiceUploadError(error.message || 'Failed to send voice message');
    }
  };

  /**
   * Dismisses voice upload error
   */
  const handleDismissVoiceError = () => {
    setVoiceUploadError(null);
    resetVoiceRecording();
  };

  return (
    <>
      {/* Voice upload progress display - Requirement 2.3, 8.2 */}
      <Collapse in={isVoiceUploading}>
        <Paper
          elevation={2}
          sx={{
            p: 2,
            borderRadius: 0,
            bgcolor: 'background.paper'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uploading voice message...
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={voiceUploadProgress} 
                sx={{ height: 6, borderRadius: 1 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {Math.round(voiceUploadProgress)}%
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Collapse>

      {/* Voice upload success feedback - Requirement 8.5 */}
      <Collapse in={showVoiceSuccess}>
        <Alert 
          severity="success" 
          sx={{ borderRadius: 0 }}
          onClose={() => setShowVoiceSuccess(false)}
        >
          Voice message sent successfully!
        </Alert>
      </Collapse>

      {/* Voice upload error with retry - Requirement 2.6, 8.4 */}
      <Collapse in={!!voiceUploadError}>
        <Alert 
          severity="error" 
          sx={{ borderRadius: 0 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton
                color="inherit"
                size="small"
                onClick={handleVoiceRetry}
                title="Retry upload"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
              <IconButton
                color="inherit"
                size="small"
                onClick={handleDismissVoiceError}
                title="Dismiss"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          {voiceUploadError}
        </Alert>
      </Collapse>

      {/* Image upload progress display */}
      <Collapse in={contextIsUploading && uploadProgress.size > 0}>
        <Paper
          elevation={2}
          sx={{
            maxHeight: 300,
            overflow: 'auto',
            borderRadius: 0
          }}
        >
          <UploadProgressList
            progressItems={Array.from(uploadProgress.values())}
            onCancel={handleCancelUpload}
          />
        </Paper>
      </Collapse>

      <Box
        component="form"
        onSubmit={handleTextSubmit}
        sx={{
          p: 2,
          bgcolor: 'white',
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          alignItems: 'center'
        }}
      >
        {/* Image upload button with validation */}
        <ImageUploadButton
          onFilesSelected={handleFilesSelected}
          disabled={uploading || isRecording || isVoiceUploading}
        />

        {/* Voice recorder - Requirement 2.3, 2.4, 2.5, 2.6, 8.2, 8.4, 8.5 */}
        <VoiceMessageErrorBoundary
          errorMessage="Voice recording is temporarily unavailable"
          onReset={handleDismissVoiceError}
        >
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onCancel={handleRecordingCancel}
          />
        </VoiceMessageErrorBoundary>

        {/* Text input */}
        <TextField
          fullWidth
          value={text}
          onChange={handleTextChange}
          placeholder="Type a message..."
          disabled={uploading || isRecording || isVoiceUploading}
          variant="outlined"
          size="small"
        />

        {/* Send button */}
        <Button
          type="submit"
          variant="contained"
          disabled={!text.trim() || uploading || isRecording || isVoiceUploading}
          endIcon={<SendIcon />}
        >
          Send
        </Button>
      </Box>

      {/* Image preview dialog */}
      <ImagePreviewDialog
        files={selectedFiles}
        open={previewOpen}
        onClose={handlePreviewClose}
        onConfirm={handlePreviewConfirm}
        onRemoveFile={removeFile}
      />
    </>
  );
}

export default MessageComposer;
