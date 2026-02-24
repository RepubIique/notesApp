import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import AudioRecorderService from '../utils/audioRecorderService';
import AudioCompressorService from '../utils/audioCompressorService';
import { voiceUploadManager } from '../utils/voiceUploadManager';
import { errorLogger, getUserFriendlyErrorMessage } from '../utils/errorLogger';

/**
 * @typedef {Object} VoiceRecordingState
 * @property {boolean} isRecording - Whether recording is active
 * @property {number} duration - Current recording duration in seconds
 * @property {Blob | null} recordingBlob - Finalized recording blob
 * @property {string | null} error - Current error message
 * @property {boolean} isUploading - Whether upload is in progress
 * @property {number} uploadProgress - Upload progress (0-100)
 */

const VoiceRecordingContext = createContext(null);

/**
 * Provider component for voice recording state management
 * Manages recording, compression, and upload of voice messages
 * 
 * Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.2
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function VoiceRecordingProvider({ children }) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [error, setError] = useState(null);
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Service instances (refs to persist across renders)
  const recorderService = useRef(new AudioRecorderService());
  const compressorService = useRef(new AudioCompressorService());
  
  // Timer ref for duration updates
  const durationTimerRef = useRef(null);
  
  // Max recording duration (5 minutes = 300 seconds)
  const MAX_DURATION = 300;

  /**
   * Start recording audio
   * Requests microphone permission and begins capturing audio
   * 
   * Validates: Requirements 1.2, 7.1, 7.2
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordingBlob(null);
      setDuration(0);
      
      // Start recording using the service
      await recorderService.current.startRecording();
      
      setIsRecording(true);
      
      // Start duration timer (updates every second)
      durationTimerRef.current = setInterval(() => {
        const currentDuration = recorderService.current.getRecordingDuration();
        setDuration(currentDuration);
        
        // Auto-stop at max duration (Requirement 1.6)
        if (currentDuration >= MAX_DURATION) {
          stopRecording();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      // Log error for monitoring (Requirement 7.2)
      errorLogger.logRecordingError(error, {
        action: 'startRecording',
        maxDuration: MAX_DURATION
      });
      
      // Get user-friendly error message
      const userMessage = getUserFriendlyErrorMessage(error);
      setError(userMessage);
      setIsRecording(false);
      
      // Cleanup resources on error
      recorderService.current.cleanup();
    }
  }, []);

  /**
   * Stop recording and finalize the audio blob
   * 
   * Validates: Requirements 1.4, 7.2
   */
  const stopRecording = useCallback(async () => {
    try {
      // Clear duration timer
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      
      // Stop recording and get the blob
      const blob = await recorderService.current.stopRecording();
      
      setRecordingBlob(blob);
      setIsRecording(false);
      
      // Update final duration
      const finalDuration = recorderService.current.getRecordingDuration();
      setDuration(finalDuration);
      
    } catch (error) {
      console.error('Failed to stop recording:', error);
      
      // Log error for monitoring (Requirement 7.2)
      errorLogger.logRecordingError(error, {
        action: 'stopRecording',
        duration: recorderService.current.getRecordingDuration()
      });
      
      const userMessage = getUserFriendlyErrorMessage(error);
      setError(userMessage);
      setIsRecording(false);
      
      // Cleanup resources on error
      recorderService.current.cleanup();
    }
  }, []);

  /**
   * Cancel recording and discard all audio data
   * 
   * Validates: Requirements 1.5, 7.2
   */
  const cancelRecording = useCallback(() => {
    try {
      // Clear duration timer
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      
      // Cancel recording and cleanup
      recorderService.current.cancelRecording();
      
      // Reset state
      setIsRecording(false);
      setDuration(0);
      setRecordingBlob(null);
      setError(null);
    } catch (error) {
      console.error('Error cancelling recording:', error);
      
      // Log error but don't show to user (cancellation should always succeed)
      errorLogger.logRecordingError(error, {
        action: 'cancelRecording'
      });
      
      // Force cleanup and reset state
      try {
        recorderService.current.cleanup();
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      
      setIsRecording(false);
      setDuration(0);
      setRecordingBlob(null);
      setError(null);
    }
  }, []);

  /**
   * Send the recorded audio message
   * Orchestrates compression and upload
   * 
   * @param {string} conversationId - ID of the conversation
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   * 
   * Validates: Requirements 2.1, 2.2, 7.3, 7.4
   */
  const sendRecording = useCallback(async (conversationId) => {
    if (!recordingBlob) {
      const errorMsg = 'No recording to send';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    // Check minimum duration (at least 1 second)
    if (duration < 1) {
      const errorMsg = 'Recording is too short. Please record for at least 1 second.';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    try {
      setError(null);
      setIsUploading(true);
      setUploadProgress(0);
      
      // Step 1: Compress audio (Requirement 2.1, 7.3)
      let compressedBlob;
      try {
        compressedBlob = await compressorService.current.compressAudio(
          recordingBlob,
          {
            targetBitrate: 48000, // 48 kbps - good balance for voice
            format: 'webm'
          }
        );
      } catch (compressionError) {
        console.error('Compression failed:', compressionError);
        
        // Log compression error (Requirement 7.3)
        errorLogger.logCompressionError(compressionError, {
          blobSize: recordingBlob.size,
          blobType: recordingBlob.type
        });
        
        const userMessage = getUserFriendlyErrorMessage(compressionError);
        setError(userMessage);
        
        // Discard recording on compression failure (Requirement 7.3)
        setRecordingBlob(null);
        setDuration(0);
        
        return {
          success: false,
          error: userMessage
        };
      }
      
      // Step 2: Upload to server (Requirement 2.2, 7.4)
      const fileName = `voice_${Date.now()}.webm`;
      
      let result;
      try {
        result = await voiceUploadManager.uploadVoiceMessage(
          compressedBlob,
          fileName,
          conversationId,
          (progress) => {
            setUploadProgress(progress);
          },
          duration // Pass the duration in seconds
        );
      } catch (uploadError) {
        console.error('Upload failed:', uploadError);
        
        // Log upload error (Requirement 7.4)
        errorLogger.logUploadError(uploadError, {
          fileName,
          fileSize: compressedBlob.size,
          conversationId
        });
        
        const userMessage = getUserFriendlyErrorMessage(uploadError);
        setError(userMessage);
        
        return {
          success: false,
          error: userMessage
        };
      }
      
      if (result.success) {
        // Clear recording state on success
        setRecordingBlob(null);
        setDuration(0);
        setUploadProgress(100);
        
        return {
          success: true,
          messageId: result.messageId,
          audioPath: result.audioPath
        };
      } else {
        // Log upload failure (Requirement 7.4)
        errorLogger.logUploadError(new Error(result.error || 'Upload failed'), {
          fileName,
          fileSize: compressedBlob.size,
          conversationId
        });
        
        const userMessage = result.error || 'Upload failed';
        setError(userMessage);
        
        return {
          success: false,
          error: userMessage
        };
      }
      
    } catch (error) {
      console.error('Failed to send recording:', error);
      
      // Log general error
      errorLogger.log(error, {
        category: 'upload',
        severity: 'error',
        metadata: { conversationId }
      });
      
      const errorMessage = getUserFriendlyErrorMessage(error);
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsUploading(false);
    }
  }, [recordingBlob]);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    cancelRecording();
    setRecordingBlob(null);
    setError(null);
    setIsUploading(false);
    setUploadProgress(0);
  }, [cancelRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      recorderService.current.cleanup();
    };
  }, []);

  const value = {
    // State
    isRecording,
    duration,
    recordingBlob,
    error,
    isUploading,
    uploadProgress,
    
    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    sendRecording,
    clearError,
    reset
  };

  return (
    <VoiceRecordingContext.Provider value={value}>
      {children}
    </VoiceRecordingContext.Provider>
  );
}

/**
 * Hook to access voice recording context
 * Must be used within a VoiceRecordingProvider
 * 
 * @returns {VoiceRecordingState & Actions} Voice recording context value
 */
export function useVoiceRecording() {
  const context = useContext(VoiceRecordingContext);
  if (!context) {
    throw new Error('useVoiceRecording must be used within a VoiceRecordingProvider');
  }
  return context;
}
