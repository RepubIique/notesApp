/**
 * AudioRecorderService
 * 
 * Encapsulates Web Audio API for recording voice messages.
 * Uses MediaRecorder with WebM/Opus codec for optimal compression and browser support.
 * 
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */

class AudioRecorderService {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.startTime = null;
    this.recordingDuration = 0;
  }

  /**
   * Request microphone permission from the user
   * @returns {Promise<boolean>} True if permission granted, false otherwise
   * Validates: Requirements 1.1
   */
  async requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Stop the stream immediately - we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Start recording audio from the microphone
   * @param {Function} onDataAvailable - Optional callback for receiving audio chunks
   * @returns {Promise<void>}
   * Validates: Requirements 1.2
   */
  async startRecording(onDataAvailable = null) {
    // Clean up any existing recording
    this.cleanup();

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Configure MediaRecorder with WebM/Opus codec
      const options = this._getMediaRecorderOptions();
      
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.audioChunks = [];
      this.startTime = Date.now();

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          if (onDataAvailable) {
            onDataAvailable(event.data);
          }
        }
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms for smooth progress
      
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop recording and return the audio blob
   * @returns {Promise<Blob>} The recorded audio as a Blob
   * Validates: Requirements 1.4
   */
  stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording to stop'));
        return;
      }

      // Set up the stop handler
      this.mediaRecorder.onstop = () => {
        try {
          // Create blob from collected chunks
          const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          
          // Calculate final duration
          this.recordingDuration = this.getRecordingDuration();
          
          // Clean up stream
          this._stopStream();
          
          resolve(audioBlob);
        } catch (error) {
          reject(error);
        }
      };

      // Stop the recorder
      this.mediaRecorder.stop();
    });
  }

  /**
   * Cancel recording and discard all audio data
   * Validates: Requirements 1.5
   */
  cancelRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.cleanup();
  }

  /**
   * Get the current recording duration in seconds
   * @returns {number} Duration in seconds
   */
  getRecordingDuration() {
    if (!this.startTime) {
      return 0;
    }
    
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Check if recording is currently active
   * @returns {boolean}
   */
  isRecording() {
    return !!(this.mediaRecorder && this.mediaRecorder.state === 'recording');
  }

  /**
   * Get MediaRecorder options with codec configuration
   * Prioritizes formats based on browser compatibility
   * Safari/iOS: MP4/AAC, Chrome/Firefox: WebM/Opus
   * @private
   */
  _getMediaRecorderOptions() {
    // Detect Safari/iOS (they don't support WebM audio well)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // For Safari/iOS, prioritize MP4/AAC
    if (isSafari || isIOS) {
      const safariOptions = [
        { mimeType: 'audio/mp4', audioBitsPerSecond: 48000 },
        { mimeType: 'audio/mp4;codecs=mp4a.40.2', audioBitsPerSecond: 48000 }, // AAC-LC
        { mimeType: 'audio/aac', audioBitsPerSecond: 48000 },
        { mimeType: 'audio/webm', audioBitsPerSecond: 48000 }, // Fallback
        {} // Browser default
      ];
      
      for (const options of safariOptions) {
        if (!options.mimeType || MediaRecorder.isTypeSupported(options.mimeType)) {
          console.log('[AudioRecorder] Using format:', options.mimeType || 'browser default', 'for Safari/iOS');
          return options;
        }
      }
    }
    
    // For Chrome/Firefox, use WebM/Opus (better compression)
    const codecOptions = [
      { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 48000 }, // Best quality/size ratio
      { mimeType: 'audio/webm', audioBitsPerSecond: 48000 },
      { mimeType: 'audio/ogg;codecs=opus', audioBitsPerSecond: 48000 },
      { mimeType: 'audio/mp4', audioBitsPerSecond: 48000 },
      {} // Fallback to browser default
    ];

    for (const options of codecOptions) {
      if (!options.mimeType || MediaRecorder.isTypeSupported(options.mimeType)) {
        console.log('[AudioRecorder] Using format:', options.mimeType || 'browser default');
        return options;
      }
    }

    return {};
  }

  /**
   * Stop the media stream and release tracks
   * @private
   */
  _stopStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Clean up all resources
   * Ensures proper cleanup of streams, blobs, and URLs on errors
   * Validates: Requirements 7.1, 7.2
   * @private
   */
  cleanup() {
    try {
      // Stop and release media stream
      this._stopStream();
      
      // Clear MediaRecorder
      if (this.mediaRecorder) {
        if (this.mediaRecorder.state !== 'inactive') {
          try {
            this.mediaRecorder.stop();
          } catch (err) {
            // Ignore errors when stopping already stopped recorder
            console.warn('Error stopping MediaRecorder during cleanup:', err);
          }
        }
        this.mediaRecorder = null;
      }
      
      // Clear audio chunks (release blob references)
      this.audioChunks = [];
      
      // Reset state
      this.startTime = null;
      this.recordingDuration = 0;
    } catch (error) {
      console.error('Error during AudioRecorderService cleanup:', error);
    }
  }
}

export default AudioRecorderService;
