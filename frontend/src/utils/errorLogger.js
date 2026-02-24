/**
 * Error Logger Utility
 * Centralized error logging for monitoring and debugging
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Error categories for voice messages
 */
export const ErrorCategory = {
  PERMISSION: 'permission',
  RECORDING: 'recording',
  COMPRESSION: 'compression',
  UPLOAD: 'upload',
  PLAYBACK: 'playback',
  NETWORK: 'network',
  STORAGE: 'storage',
  UNKNOWN: 'unknown'
};

/**
 * Error logger class
 */
class ErrorLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100; // Keep last 100 errors in memory
  }

  /**
   * Log an error with context
   * 
   * @param {Error|string} error - Error object or message
   * @param {Object} context - Additional context
   * @param {string} context.category - Error category
   * @param {string} context.severity - Error severity
   * @param {Object} context.metadata - Additional metadata
   */
  log(error, context = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Error',
      category: context.category || ErrorCategory.UNKNOWN,
      severity: context.severity || ErrorSeverity.ERROR,
      metadata: {
        ...context.metadata,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      }
    };

    // Add to in-memory logs
    this.logs.push(errorLog);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorLogger]', errorLog);
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(errorLog);
    }

    return errorLog;
  }

  /**
   * Log a permission error
   * Validates: Requirement 7.1
   */
  logPermissionError(error, metadata = {}) {
    return this.log(error, {
      category: ErrorCategory.PERMISSION,
      severity: ErrorSeverity.WARNING,
      metadata
    });
  }

  /**
   * Log a recording error
   * Validates: Requirement 7.2
   */
  logRecordingError(error, metadata = {}) {
    return this.log(error, {
      category: ErrorCategory.RECORDING,
      severity: ErrorSeverity.ERROR,
      metadata
    });
  }

  /**
   * Log a compression error
   * Validates: Requirement 7.3
   */
  logCompressionError(error, metadata = {}) {
    return this.log(error, {
      category: ErrorCategory.COMPRESSION,
      severity: ErrorSeverity.ERROR,
      metadata
    });
  }

  /**
   * Log an upload error
   * Validates: Requirement 7.4
   */
  logUploadError(error, metadata = {}) {
    return this.log(error, {
      category: ErrorCategory.UPLOAD,
      severity: ErrorSeverity.ERROR,
      metadata
    });
  }

  /**
   * Log a playback error
   * Validates: Requirement 7.5
   */
  logPlaybackError(error, metadata = {}) {
    return this.log(error, {
      category: ErrorCategory.PLAYBACK,
      severity: ErrorSeverity.ERROR,
      metadata
    });
  }

  /**
   * Log a network error
   */
  logNetworkError(error, metadata = {}) {
    return this.log(error, {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.WARNING,
      metadata
    });
  }

  /**
   * Send error to monitoring service
   * In production, this would integrate with services like:
   * - Sentry
   * - LogRocket
   * - Datadog
   * - New Relic
   * 
   * @param {Object} errorLog - Structured error log
   */
  sendToMonitoring(errorLog) {
    // Example: Send to Sentry
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(errorLog.message), {
    //     level: errorLog.severity,
    //     tags: {
    //       category: errorLog.category
    //     },
    //     extra: errorLog.metadata
    //   });
    // }

    // Example: Send to custom backend endpoint
    // fetch('/api/logs/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorLog)
    // }).catch(err => console.error('Failed to send error log:', err));

    // For now, just log that we would send it
    console.log('[ErrorLogger] Would send to monitoring:', errorLog);
  }

  /**
   * Get recent error logs
   * 
   * @param {number} count - Number of recent logs to retrieve
   * @returns {Array} Recent error logs
   */
  getRecentLogs(count = 10) {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by category
   * 
   * @param {string} category - Error category
   * @returns {Array} Filtered error logs
   */
  getLogsByCategory(category) {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   * 
   * @returns {string} JSON string of all logs
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

/**
 * User-friendly error messages
 * Maps technical errors to user-friendly messages
 */
export const ErrorMessages = {
  // Permission errors (Requirement 7.1)
  PERMISSION_DENIED: 'Microphone access is required to record voice messages. Please allow microphone access in your browser settings.',
  PERMISSION_DISMISSED: 'Microphone permission was not granted. Please try again and allow access.',
  NO_MICROPHONE: 'No microphone found. Please connect a microphone and try again.',
  
  // Recording errors (Requirement 7.2)
  RECORDING_FAILED: 'Recording failed. Please try again.',
  RECORDING_NOT_SUPPORTED: 'Voice messages are not supported in this browser. Please use Chrome, Firefox, Edge, or Safari.',
  RECORDING_INTERRUPTED: 'Recording was interrupted. Please try again.',
  
  // Compression errors (Requirement 7.3)
  COMPRESSION_FAILED: 'Failed to process audio. Please try again.',
  INVALID_FORMAT: 'Unsupported audio format. Please try recording again.',
  
  // Upload errors (Requirement 7.4)
  UPLOAD_FAILED: 'Upload failed. Please try again.',
  UPLOAD_TIMEOUT: 'Upload timed out. Please check your connection and try again.',
  UPLOAD_NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UPLOAD_SIZE_EXCEEDED: 'Audio file is too large. Please record a shorter message.',
  UPLOAD_QUOTA_EXCEEDED: 'Storage limit reached. Please delete old messages and try again.',
  
  // Playback errors (Requirement 7.5)
  PLAYBACK_FAILED: 'Playback failed. The audio file may be corrupted.',
  AUDIO_LOAD_FAILED: 'Failed to load audio. Please try again.',
  AUDIO_NOT_FOUND: 'Audio file not found.',
  
  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  
  // Generic
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
};

/**
 * Get user-friendly error message from error object
 * 
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyErrorMessage(error) {
  if (!error) return ErrorMessages.UNKNOWN_ERROR;

  const errorMessage = error.message || '';
  const errorName = error.name || '';

  // Permission errors
  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
    return ErrorMessages.PERMISSION_DENIED;
  }
  if (errorName === 'NotFoundError' || errorMessage.includes('microphone')) {
    return ErrorMessages.NO_MICROPHONE;
  }

  // Recording errors
  if (errorMessage.includes('not supported') || errorMessage.includes('MediaRecorder')) {
    return ErrorMessages.RECORDING_NOT_SUPPORTED;
  }
  if (errorMessage.includes('recording')) {
    return ErrorMessages.RECORDING_FAILED;
  }

  // Compression errors
  if (errorMessage.includes('compression') || errorMessage.includes('compress') || errorMessage.includes('Failed to process')) {
    return ErrorMessages.COMPRESSION_FAILED;
  }
  if (errorMessage.includes('format')) {
    return ErrorMessages.INVALID_FORMAT;
  }

  // Upload errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return ErrorMessages.UPLOAD_TIMEOUT;
  }
  if (errorMessage.toLowerCase().includes('network')) {
    return ErrorMessages.UPLOAD_NETWORK_ERROR;
  }
  if (errorMessage.includes('size') || errorMessage.includes('too large')) {
    return ErrorMessages.UPLOAD_SIZE_EXCEEDED;
  }
  if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
    return ErrorMessages.UPLOAD_QUOTA_EXCEEDED;
  }
  if (errorMessage.includes('upload')) {
    return ErrorMessages.UPLOAD_FAILED;
  }

  // Playback errors
  if (errorMessage.toLowerCase().includes('playback')) {
    return ErrorMessages.PLAYBACK_FAILED;
  }
  if (errorMessage.includes('load') || errorMessage.includes('loading')) {
    return ErrorMessages.AUDIO_LOAD_FAILED;
  }
  if (errorMessage.includes('not found')) {
    return ErrorMessages.AUDIO_NOT_FOUND;
  }

  // Server errors
  if (errorMessage.includes('server') || errorMessage.includes('500')) {
    return ErrorMessages.SERVER_ERROR;
  }

  return ErrorMessages.UNKNOWN_ERROR;
}
