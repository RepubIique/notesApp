import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  errorLogger, 
  ErrorSeverity, 
  ErrorCategory, 
  ErrorMessages,
  getUserFriendlyErrorMessage 
} from './errorLogger';

describe('ErrorLogger', () => {
  beforeEach(() => {
    errorLogger.clearLogs();
  });

  describe('log', () => {
    it('should log an error with context', () => {
      const error = new Error('Test error');
      const log = errorLogger.log(error, {
        category: ErrorCategory.RECORDING,
        severity: ErrorSeverity.ERROR,
        metadata: { test: 'data' }
      });

      expect(log.message).toBe('Test error');
      expect(log.category).toBe(ErrorCategory.RECORDING);
      expect(log.severity).toBe(ErrorSeverity.ERROR);
      expect(log.metadata.test).toBe('data');
    });

    it('should log string errors', () => {
      const log = errorLogger.log('String error message');
      
      expect(log.message).toBe('String error message');
      expect(log.category).toBe(ErrorCategory.UNKNOWN);
    });

    it('should keep only last maxLogs entries', () => {
      // Log more than maxLogs (100) errors
      for (let i = 0; i < 110; i++) {
        errorLogger.log(`Error ${i}`);
      }

      const logs = errorLogger.getRecentLogs(200);
      expect(logs.length).toBe(100);
      expect(logs[0].message).toBe('Error 10'); // First 10 should be removed
    });
  });

  describe('category-specific logging', () => {
    it('should log permission errors', () => {
      const error = new Error('Permission denied');
      const log = errorLogger.logPermissionError(error);

      expect(log.category).toBe(ErrorCategory.PERMISSION);
      expect(log.severity).toBe(ErrorSeverity.WARNING);
    });

    it('should log recording errors', () => {
      const error = new Error('Recording failed');
      const log = errorLogger.logRecordingError(error);

      expect(log.category).toBe(ErrorCategory.RECORDING);
      expect(log.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should log compression errors', () => {
      const error = new Error('Compression failed');
      const log = errorLogger.logCompressionError(error);

      expect(log.category).toBe(ErrorCategory.COMPRESSION);
      expect(log.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should log upload errors', () => {
      const error = new Error('Upload failed');
      const log = errorLogger.logUploadError(error);

      expect(log.category).toBe(ErrorCategory.UPLOAD);
      expect(log.severity).toBe(ErrorSeverity.ERROR);
    });

    it('should log playback errors', () => {
      const error = new Error('Playback failed');
      const log = errorLogger.logPlaybackError(error);

      expect(log.category).toBe(ErrorCategory.PLAYBACK);
      expect(log.severity).toBe(ErrorSeverity.ERROR);
    });
  });

  describe('getRecentLogs', () => {
    it('should return recent logs', () => {
      errorLogger.log('Error 1');
      errorLogger.log('Error 2');
      errorLogger.log('Error 3');

      const logs = errorLogger.getRecentLogs(2);
      expect(logs.length).toBe(2);
      expect(logs[0].message).toBe('Error 2');
      expect(logs[1].message).toBe('Error 3');
    });
  });

  describe('getLogsByCategory', () => {
    it('should filter logs by category', () => {
      errorLogger.logRecordingError(new Error('Recording error'));
      errorLogger.logUploadError(new Error('Upload error'));
      errorLogger.logRecordingError(new Error('Another recording error'));

      const recordingLogs = errorLogger.getLogsByCategory(ErrorCategory.RECORDING);
      expect(recordingLogs.length).toBe(2);
      expect(recordingLogs[0].category).toBe(ErrorCategory.RECORDING);
    });
  });

  describe('exportLogs', () => {
    it('should export logs as JSON', () => {
      errorLogger.log('Test error');
      const exported = errorLogger.exportLogs();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].message).toBe('Test error');
    });
  });
});

describe('getUserFriendlyErrorMessage', () => {
  it('should return permission denied message for NotAllowedError', () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(ErrorMessages.PERMISSION_DENIED);
  });

  it('should return no microphone message for NotFoundError', () => {
    const error = new Error('No microphone');
    error.name = 'NotFoundError';
    
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(ErrorMessages.NO_MICROPHONE);
  });

  it('should return recording not supported message', () => {
    const error = new Error('MediaRecorder not supported');
    
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(ErrorMessages.RECORDING_NOT_SUPPORTED);
  });

  it('should return compression failed message', () => {
    const error = new Error('Audio compression failed');
    
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(ErrorMessages.COMPRESSION_FAILED);
  });

  it('should return upload timeout message', () => {
    const error = new Error('Upload timed out');
    
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(ErrorMessages.UPLOAD_TIMEOUT);
  });

  it('should return network error message', () => {
    const error = new Error('Network error occurred');
    
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(ErrorMessages.UPLOAD_NETWORK_ERROR);
  });

  it('should return size exceeded message', () => {
    const error = new Error('File size too large');
    
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(ErrorMessages.UPLOAD_SIZE_EXCEEDED);
  });

  it('should return quota exceeded message', () => {
    const error = new Error('Storage quota exceeded');
    
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(ErrorMessages.UPLOAD_QUOTA_EXCEEDED);
  });

  it('should return playback failed message', () => {
    const error = new Error('Playback error');
    
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(ErrorMessages.PLAYBACK_FAILED);
  });

  it('should return audio load failed message', () => {
    const error = new Error('Failed to load audio');
    
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(ErrorMessages.AUDIO_LOAD_FAILED);
  });

  it('should return unknown error for unrecognized errors', () => {
    const error = new Error('Some random error');
    
    const message = getUserFriendlyErrorMessage(error);
    expect(message).toBe(ErrorMessages.UNKNOWN_ERROR);
  });

  it('should handle null error', () => {
    const message = getUserFriendlyErrorMessage(null);
    expect(message).toBe(ErrorMessages.UNKNOWN_ERROR);
  });
});
