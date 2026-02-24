/**
 * AudioCompressorService
 * 
 * Handles audio compression and format validation for voice messages.
 * Ensures audio files are in web-compatible formats with optimal bitrate for voice.
 * 
 * Requirements: 2.1, 4.1, 4.2, 4.4
 */

class AudioCompressorService {
  constructor() {
    // Target bitrate range for voice messages (32-64 kbps)
    this.MIN_BITRATE = 32000; // 32 kbps
    this.MAX_BITRATE = 64000; // 64 kbps
    this.DEFAULT_BITRATE = 48000; // 48 kbps - good balance
    
    // Supported web-compatible formats
    this.SUPPORTED_FORMATS = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'];
  }

  /**
   * Compress audio blob with format validation
   * 
   * @param {Blob} audioBlob - The audio blob to compress
   * @param {Object} options - Compression options
   * @param {number} options.targetBitrate - Target bitrate in bps (default: 48000)
   * @param {string} options.format - Preferred format (default: 'webm')
   * @returns {Promise<Blob>} Compressed audio blob or original on failure
   * 
   * Validates: Requirements 2.1, 4.1, 4.2, 4.4
   */
  async compressAudio(audioBlob, options = {}) {
    try {
      // Validate input
      if (!audioBlob || !(audioBlob instanceof Blob)) {
        throw new Error('Invalid audio blob');
      }

      // Set default options
      const targetBitrate = this._validateBitrate(options.targetBitrate || this.DEFAULT_BITRATE);
      const preferredFormat = options.format || 'webm';

      // Validate format
      const isValidFormat = this._isWebCompatibleFormat(audioBlob.type);
      
      if (!isValidFormat) {
        console.warn(`Unsupported audio format: ${audioBlob.type}. Attempting conversion.`);
        // Try to convert to preferred format
        return await this._convertFormat(audioBlob, preferredFormat, targetBitrate);
      }

      // If the blob is already in a good format and was recorded with appropriate bitrate,
      // we can return it as-is. MediaRecorder already handles compression during recording.
      // Additional compression would require re-encoding which could degrade quality.
      
      console.log(`Audio format validated: ${audioBlob.type}, size: ${audioBlob.size} bytes`);
      return audioBlob;

    } catch (error) {
      console.error('Audio compression failed:', error);
      // Fallback to original blob on compression failure (Requirement 4.2)
      console.warn('Falling back to original audio blob');
      return audioBlob;
    }
  }

  /**
   * Validate that bitrate is within acceptable range
   * 
   * @param {number} bitrate - Bitrate in bps
   * @returns {number} Validated bitrate
   * @private
   * 
   * Validates: Requirement 4.4
   */
  _validateBitrate(bitrate) {
    if (typeof bitrate !== 'number' || bitrate < this.MIN_BITRATE) {
      console.warn(`Bitrate ${bitrate} below minimum, using ${this.MIN_BITRATE}`);
      return this.MIN_BITRATE;
    }
    
    if (bitrate > this.MAX_BITRATE) {
      console.warn(`Bitrate ${bitrate} above maximum, using ${this.MAX_BITRATE}`);
      return this.MAX_BITRATE;
    }
    
    return bitrate;
  }

  /**
   * Check if audio format is web-compatible
   * 
   * @param {string} mimeType - MIME type to check
   * @returns {boolean} True if format is supported
   * @private
   * 
   * Validates: Requirement 4.1
   */
  _isWebCompatibleFormat(mimeType) {
    if (!mimeType) {
      return false;
    }

    // Trim whitespace and convert to lowercase for comparison
    const normalizedType = mimeType.trim().toLowerCase();
    
    // Check if the base type matches any supported format
    // Also handle audio/mp3 as an alias for audio/mpeg
    return this.SUPPORTED_FORMATS.some(format => 
      normalizedType.startsWith(format)
    ) || normalizedType.startsWith('audio/mp3');
  }

  /**
   * Convert audio to a different format using MediaRecorder
   * This is a fallback for unsupported formats
   * 
   * @param {Blob} audioBlob - Original audio blob
   * @param {string} targetFormat - Target format (webm, mp4, ogg)
   * @param {number} targetBitrate - Target bitrate
   * @returns {Promise<Blob>} Converted audio blob
   * @private
   * 
   * Validates: Requirements 4.1, 4.2
   */
  async _convertFormat(audioBlob, targetFormat, targetBitrate) {
    try {
      // Create an audio element to decode the blob
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create a MediaStreamDestination to re-encode
      const destination = audioContext.createMediaStreamDestination();
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(destination);

      // Determine the best supported MIME type
      const mimeType = this._getBestSupportedMimeType(targetFormat, targetBitrate);
      
      if (!mimeType) {
        throw new Error('No supported format for conversion');
      }

      // Set up MediaRecorder for re-encoding
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType,
        audioBitsPerSecond: targetBitrate
      });

      const chunks = [];
      
      return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const convertedBlob = new Blob(chunks, { type: mimeType });
          audioContext.close();
          resolve(convertedBlob);
        };

        mediaRecorder.onerror = (error) => {
          audioContext.close();
          reject(error);
        };

        // Start recording and playback
        mediaRecorder.start();
        source.start(0);

        // Stop after the audio finishes
        source.onended = () => {
          mediaRecorder.stop();
        };
      });

    } catch (error) {
      console.error('Format conversion failed:', error);
      // Return original blob if conversion fails
      return audioBlob;
    }
  }

  /**
   * Get the best supported MIME type for the target format
   * 
   * @param {string} targetFormat - Target format (webm, mp4, ogg)
   * @param {number} targetBitrate - Target bitrate
   * @returns {string|null} Best supported MIME type or null
   * @private
   */
  _getBestSupportedMimeType(targetFormat, targetBitrate) {
    // Try different codec options in order of preference
    const codecOptions = [
      `audio/webm;codecs=opus`,
      `audio/webm`,
      `audio/ogg;codecs=opus`,
      `audio/mp4`,
      `audio/mpeg`
    ];

    // If a specific format is requested, prioritize it
    if (targetFormat === 'webm') {
      codecOptions.unshift(`audio/webm;codecs=opus`);
    } else if (targetFormat === 'ogg') {
      codecOptions.unshift(`audio/ogg;codecs=opus`);
    } else if (targetFormat === 'mp4') {
      codecOptions.unshift(`audio/mp4`);
    }

    for (const mimeType of codecOptions) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    return null;
  }

  /**
   * Get compression statistics for an audio blob
   * Useful for testing and debugging
   * 
   * @param {Blob} originalBlob - Original audio blob
   * @param {Blob} compressedBlob - Compressed audio blob
   * @returns {Object} Compression statistics
   */
  getCompressionStats(originalBlob, compressedBlob) {
    const originalSize = originalBlob.size;
    const compressedSize = compressedBlob.size;
    const compressionRatio = originalSize > 0 ? (compressedSize / originalSize) : 1;
    const savedBytes = originalSize - compressedSize;
    const savedPercentage = originalSize > 0 ? ((savedBytes / originalSize) * 100) : 0;

    return {
      originalSize,
      compressedSize,
      compressionRatio: compressionRatio.toFixed(2),
      savedBytes,
      savedPercentage: `${savedPercentage.toFixed(2)}%`
    };
  }
}

export default AudioCompressorService;
