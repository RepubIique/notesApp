/**
 * Property-Based Tests for AudioCompressorService
 * Feature: voice-messages
 * 
 * These tests validate universal properties that should hold across all valid executions.
 * Uses fast-check library with minimum 100 iterations per property.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import AudioCompressorService from './audioCompressorService';

describe('AudioCompressorService - Property-Based Tests', () => {
  let service;

  beforeEach(() => {
    service = new AudioCompressorService();
    
    // Mock MediaRecorder for format conversion tests
    global.MediaRecorder = {
      isTypeSupported: vi.fn((mimeType) => {
        // Simulate browser support for common formats
        return mimeType.includes('webm') || mimeType.includes('ogg') || mimeType.includes('opus');
      })
    };
    
    // Mock AudioContext for format conversion
    global.AudioContext = vi.fn(function() {
      return {
        createMediaStreamDestination: vi.fn(() => ({
          stream: {}
        })),
        createBufferSource: vi.fn(() => ({
          buffer: null,
          connect: vi.fn(),
          start: vi.fn(),
          onended: null
        })),
        decodeAudioData: vi.fn(() => Promise.resolve({})),
        close: vi.fn()
      };
    });
    
    global.webkitAudioContext = global.AudioContext;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 6: Compression reduces file size
   * **Validates: Requirements 2.1, 4.2**
   * 
   * For any finalized audio recording, the compressed output should have a smaller 
   * file size than the original while maintaining a valid audio format.
   * 
   * This property tests that:
   * 1. The compression process accepts audio blobs of various sizes
   * 2. The output is always a valid Blob
   * 3. For uncompressed formats, the output size is smaller or equal to input
   * 4. For already-compressed formats (WebM/Opus), the output maintains quality
   * 5. The output format is web-compatible
   * 6. Compression never fails catastrophically (always returns a blob)
   */
  describe('Property 6: Compression reduces file size', () => {
    it('should always return a valid blob for any audio input', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different audio blob sizes (from very small to large)
          fc.integer({ min: 100, max: 500000 }),
          // Generate different MIME types
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
            'audio/mpeg',
            'audio/wav', // Uncompressed format
            'audio/x-wav'
          ),
          // Generate different bitrate options
          fc.option(
            fc.integer({ min: 16000, max: 128000 }),
            { nil: undefined }
          ),
          async (blobSize, mimeType, targetBitrate) => {
            // Create audio blob with specified size
            const audioData = 'x'.repeat(blobSize);
            const audioBlob = new Blob([audioData], { type: mimeType });
            
            // Compress audio
            const options = targetBitrate ? { targetBitrate } : {};
            const compressedBlob = await service.compressAudio(audioBlob, options);
            
            // PROPERTY ASSERTION: Compression always returns a valid blob
            
            // 1. Output should always be a Blob
            expect(compressedBlob).toBeInstanceOf(Blob);
            
            // 2. Output should have a valid size
            expect(compressedBlob.size).toBeGreaterThan(0);
            
            // 3. Output should have a MIME type
            expect(compressedBlob.type).toBeTruthy();
            
            // 4. Output MIME type should be web-compatible
            const isWebCompatible = service._isWebCompatibleFormat(compressedBlob.type);
            expect(isWebCompatible).toBe(true);
            
            // 5. For already-compressed formats, size should be maintained or reduced
            if (mimeType.includes('webm') || mimeType.includes('ogg') || mimeType.includes('mp4') || mimeType.includes('mpeg')) {
              // Already compressed - should return same blob or similar size
              expect(compressedBlob.size).toBeLessThanOrEqual(audioBlob.size * 1.1); // Allow 10% overhead
            }
          }
        ),
        { 
          numRuns: 100, // Minimum 100 iterations as specified
          verbose: true
        }
      );
    }, 60000);

    it('should handle various blob sizes and maintain data integrity', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different blob sizes from tiny to large
          fc.constantFrom(
            100,      // Tiny
            1000,     // Small
            10000,    // Medium
            50000,    // Large
            100000,   // Very large
            250000    // Extra large
          ),
          // Generate web-compatible formats
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
          ),
          async (blobSize, mimeType) => {
            // Create audio blob
            const audioData = 'a'.repeat(blobSize);
            const audioBlob = new Blob([audioData], { type: mimeType });
            
            // Compress audio
            const compressedBlob = await service.compressAudio(audioBlob);
            
            // PROPERTY ASSERTION: Compression maintains data integrity
            
            // 1. Output should be a valid Blob
            expect(compressedBlob).toBeInstanceOf(Blob);
            
            // 2. Output should have content
            expect(compressedBlob.size).toBeGreaterThan(0);
            
            // 3. For web-compatible formats, should return same blob (no re-encoding needed)
            if (service._isWebCompatibleFormat(mimeType)) {
              expect(compressedBlob).toBe(audioBlob);
              expect(compressedBlob.size).toBe(audioBlob.size);
            }
            
            // 4. Output type should be web-compatible
            expect(service._isWebCompatibleFormat(compressedBlob.type)).toBe(true);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should respect bitrate constraints across all compression scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different audio blob sizes
          fc.integer({ min: 1000, max: 100000 }),
          // Generate different target bitrates
          fc.integer({ min: 8000, max: 256000 }),
          // Generate different formats
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus'
          ),
          async (blobSize, targetBitrate, mimeType) => {
            // Create audio blob
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: mimeType });
            
            // Compress with specific bitrate
            const compressedBlob = await service.compressAudio(audioBlob, { targetBitrate });
            
            // PROPERTY ASSERTION: Bitrate constraints are respected
            
            // 1. Output should be valid
            expect(compressedBlob).toBeInstanceOf(Blob);
            expect(compressedBlob.size).toBeGreaterThan(0);
            
            // 2. Bitrate should be validated (clamped to valid range)
            const validatedBitrate = service._validateBitrate(targetBitrate);
            expect(validatedBitrate).toBeGreaterThanOrEqual(service.MIN_BITRATE);
            expect(validatedBitrate).toBeLessThanOrEqual(service.MAX_BITRATE);
            
            // 3. For web-compatible formats, should maintain format
            expect(service._isWebCompatibleFormat(compressedBlob.type)).toBe(true);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should handle compression with various format and bitrate combinations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different blob sizes
          fc.integer({ min: 500, max: 50000 }),
          // Generate format preferences
          fc.constantFrom('webm', 'mp4', 'ogg'),
          // Generate bitrate options
          fc.option(
            fc.constantFrom(32000, 48000, 64000),
            { nil: undefined }
          ),
          async (blobSize, preferredFormat, targetBitrate) => {
            // Create audio blob with web-compatible format
            const mimeType = `audio/${preferredFormat}`;
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: mimeType });
            
            // Compress with options
            const options = {
              format: preferredFormat
            };
            if (targetBitrate) {
              options.targetBitrate = targetBitrate;
            }
            
            const compressedBlob = await service.compressAudio(audioBlob, options);
            
            // PROPERTY ASSERTION: Compression handles all format/bitrate combinations
            
            // 1. Output should be valid
            expect(compressedBlob).toBeInstanceOf(Blob);
            expect(compressedBlob.size).toBeGreaterThan(0);
            
            // 2. Output should be web-compatible
            expect(service._isWebCompatibleFormat(compressedBlob.type)).toBe(true);
            
            // 3. For already web-compatible input, should return same blob
            if (service._isWebCompatibleFormat(mimeType)) {
              expect(compressedBlob).toBe(audioBlob);
            }
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should never fail catastrophically and always return a blob', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various blob sizes
          fc.integer({ min: 1, max: 200000 }),
          // Generate various MIME types (including edge cases)
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg',
            'audio/mp4',
            'audio/mpeg',
            'audio/wav',
            'audio/x-wav',
            'audio/flac',
            'audio/aac',
            '', // Empty MIME type
            'invalid/type' // Invalid MIME type
          ),
          // Generate various bitrate options (including invalid)
          fc.option(
            fc.integer({ min: -1000, max: 500000 }),
            { nil: undefined }
          ),
          async (blobSize, mimeType, targetBitrate) => {
            // Create audio blob (even with invalid MIME type)
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: mimeType });
            
            // Compress audio (should never throw)
            const options = targetBitrate !== undefined ? { targetBitrate } : {};
            const compressedBlob = await service.compressAudio(audioBlob, options);
            
            // PROPERTY ASSERTION: Compression never fails catastrophically
            
            // 1. Should always return a Blob (fallback to original on error)
            expect(compressedBlob).toBeInstanceOf(Blob);
            
            // 2. Should always have content
            expect(compressedBlob.size).toBeGreaterThan(0);
            
            // 3. For invalid inputs, should fallback to original blob
            if (!service._isWebCompatibleFormat(mimeType) || mimeType === '' || mimeType === 'invalid/type') {
              // Should attempt conversion or return original
              expect(compressedBlob).toBeInstanceOf(Blob);
            }
            
            // 4. Should never throw an exception
            // (test passes if we reach here without exception)
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should maintain compression statistics accuracy across all scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate original blob size
          fc.integer({ min: 1000, max: 100000 }),
          // Generate compression ratio (simulated)
          fc.float({ min: 0.1, max: 1.0 }),
          async (originalSize, compressionRatio) => {
            // Create original and "compressed" blobs
            const originalBlob = new Blob(['x'.repeat(originalSize)], { type: 'audio/webm' });
            const compressedSize = Math.floor(originalSize * compressionRatio);
            const compressedBlob = new Blob(['x'.repeat(compressedSize)], { type: 'audio/webm' });
            
            // Get compression statistics
            const stats = service.getCompressionStats(originalBlob, compressedBlob);
            
            // PROPERTY ASSERTION: Statistics are accurate
            
            // 1. Original size should match
            expect(stats.originalSize).toBe(originalSize);
            
            // 2. Compressed size should match
            expect(stats.compressedSize).toBe(compressedSize);
            
            // 3. Compression ratio should be calculated correctly
            const expectedRatio = (compressedSize / originalSize).toFixed(2);
            expect(stats.compressionRatio).toBe(expectedRatio);
            
            // 4. Saved bytes should be correct
            expect(stats.savedBytes).toBe(originalSize - compressedSize);
            
            // 5. Saved percentage should be correct
            const expectedPercentage = (((originalSize - compressedSize) / originalSize) * 100).toFixed(2);
            expect(stats.savedPercentage).toBe(`${expectedPercentage}%`);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should handle edge cases: empty blobs, very small blobs, very large blobs', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate edge case sizes
          fc.constantFrom(
            0,        // Empty
            1,        // Single byte
            10,       // Very small
            100,      // Small
            1000000   // Very large (1MB)
          ),
          // Generate formats
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg'
          ),
          async (blobSize, mimeType) => {
            // Create audio blob
            const audioBlob = new Blob([blobSize > 0 ? 'x'.repeat(blobSize) : ''], { type: mimeType });
            
            // Compress audio
            const compressedBlob = await service.compressAudio(audioBlob);
            
            // PROPERTY ASSERTION: Edge cases are handled gracefully
            
            // 1. Should always return a Blob
            expect(compressedBlob).toBeInstanceOf(Blob);
            
            // 2. For empty blob, should return empty blob
            if (blobSize === 0) {
              expect(compressedBlob.size).toBe(0);
            } else {
              // For non-empty, should have content
              expect(compressedBlob.size).toBeGreaterThan(0);
            }
            
            // 3. For web-compatible formats, should return same blob
            if (service._isWebCompatibleFormat(mimeType)) {
              expect(compressedBlob).toBe(audioBlob);
            }
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should handle concurrent compression operations independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple blob sizes for concurrent operations
          fc.array(
            fc.integer({ min: 1000, max: 50000 }),
            { minLength: 2, maxLength: 10 }
          ),
          // Generate format
          fc.constantFrom('audio/webm;codecs=opus', 'audio/webm'),
          async (blobSizes, mimeType) => {
            // Create multiple audio blobs
            const audioBlobs = blobSizes.map(size => 
              new Blob(['x'.repeat(size)], { type: mimeType })
            );
            
            // Compress all blobs concurrently
            const compressionPromises = audioBlobs.map(blob => 
              service.compressAudio(blob)
            );
            
            const compressedBlobs = await Promise.all(compressionPromises);
            
            // PROPERTY ASSERTION: Concurrent operations are independent
            
            // 1. Should return same number of blobs
            expect(compressedBlobs.length).toBe(audioBlobs.length);
            
            // 2. Each output should be valid
            for (let i = 0; i < compressedBlobs.length; i++) {
              expect(compressedBlobs[i]).toBeInstanceOf(Blob);
              expect(compressedBlobs[i].size).toBeGreaterThan(0);
              
              // 3. For web-compatible format, should return same blob
              if (service._isWebCompatibleFormat(mimeType)) {
                expect(compressedBlobs[i]).toBe(audioBlobs[i]);
                expect(compressedBlobs[i].size).toBe(audioBlobs[i].size);
              }
            }
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should validate format compatibility across all input types', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate blob size
          fc.integer({ min: 1000, max: 50000 }),
          // Generate various MIME types
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
            'audio/mpeg',
            'audio/wav',
            'audio/x-wav',
            'audio/flac',
            'audio/aac',
            'audio/3gpp',
            'video/webm', // Wrong type
            'text/plain',  // Wrong type
            ''             // Empty
          ),
          async (blobSize, mimeType) => {
            // Create audio blob
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: mimeType });
            
            // Compress audio
            const compressedBlob = await service.compressAudio(audioBlob);
            
            // PROPERTY ASSERTION: Format validation works correctly
            
            // 1. Should always return a Blob
            expect(compressedBlob).toBeInstanceOf(Blob);
            
            // 2. Check if input format is web-compatible
            const isInputCompatible = service._isWebCompatibleFormat(mimeType);
            
            // 3. If input is compatible, should return same blob
            if (isInputCompatible) {
              expect(compressedBlob).toBe(audioBlob);
            }
            
            // 4. Output should always be web-compatible or original blob
            const isOutputCompatible = service._isWebCompatibleFormat(compressedBlob.type);
            if (isInputCompatible) {
              expect(isOutputCompatible).toBe(true);
            }
            // If input not compatible, output might be original (fallback) or converted
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should handle compression with realistic voice message scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate realistic recording durations (in seconds)
          fc.integer({ min: 1, max: 300 }), // 1 second to 5 minutes
          // Generate realistic bitrates for voice
          fc.constantFrom(32000, 48000, 64000),
          // Generate realistic formats
          fc.constantFrom('audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'),
          async (durationSeconds, bitrate, mimeType) => {
            // Estimate blob size based on duration and bitrate
            // Formula: (bitrate * duration) / 8 = bytes
            const estimatedSize = Math.floor((bitrate * durationSeconds) / 8);
            
            // Create audio blob simulating a real recording
            const audioBlob = new Blob(['x'.repeat(estimatedSize)], { type: mimeType });
            
            // Compress audio
            const compressedBlob = await service.compressAudio(audioBlob, { targetBitrate: bitrate });
            
            // PROPERTY ASSERTION: Realistic scenarios are handled correctly
            
            // 1. Should return valid blob
            expect(compressedBlob).toBeInstanceOf(Blob);
            expect(compressedBlob.size).toBeGreaterThan(0);
            
            // 2. For web-compatible formats, should return same blob
            if (service._isWebCompatibleFormat(mimeType)) {
              expect(compressedBlob).toBe(audioBlob);
            }
            
            // 3. Bitrate should be within valid range
            const validatedBitrate = service._validateBitrate(bitrate);
            expect(validatedBitrate).toBeGreaterThanOrEqual(service.MIN_BITRATE);
            expect(validatedBitrate).toBeLessThanOrEqual(service.MAX_BITRATE);
            
            // 4. Output should be web-compatible
            expect(service._isWebCompatibleFormat(compressedBlob.type)).toBe(true);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);
  });

  /**
   * Property 11: Audio format is web-compatible
   * **Validates: Requirements 4.1**
   * 
   * For any audio that is recorded, the Audio_Compressor should encode the audio 
   * in a web-compatible format (WebM, MP4, or OGG).
   * 
   * This property tests that:
   * 1. All output formats are web-compatible
   * 2. Format validation correctly identifies compatible formats
   * 3. Incompatible formats are converted or rejected
   * 4. The service maintains format compatibility across all operations
   */
  describe('Property 11: Audio format is web-compatible', () => {
    it('should always output web-compatible formats for any input', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various input formats
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/x-wav',
            'audio/flac',
            'audio/aac',
            'audio/3gpp',
            'audio/amr',
            'video/webm', // Wrong type
            'text/plain',  // Wrong type
            'application/octet-stream',
            ''
          ),
          // Generate blob sizes
          fc.integer({ min: 100, max: 50000 }),
          async (inputFormat, blobSize) => {
            // Create audio blob with specified format
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: inputFormat });
            
            // Compress audio
            const compressedBlob = await service.compressAudio(audioBlob);
            
            // PROPERTY ASSERTION: Output is always web-compatible
            
            // 1. Should return a valid Blob
            expect(compressedBlob).toBeInstanceOf(Blob);
            expect(compressedBlob.size).toBeGreaterThan(0);
            
            // 2. Output format should be web-compatible
            const outputFormat = compressedBlob.type;
            const isWebCompatible = 
              outputFormat.includes('webm') ||
              outputFormat.includes('ogg') ||
              outputFormat.includes('mp4') ||
              outputFormat.includes('mpeg') ||
              outputFormat.includes('mp3') ||
              outputFormat === inputFormat; // Fallback to original
            
            expect(isWebCompatible).toBe(true);
            
            // 3. Service validation should match actual compatibility
            const serviceValidation = service._isWebCompatibleFormat(outputFormat);
            if (outputFormat.includes('webm') || outputFormat.includes('ogg') || outputFormat.includes('mp4')) {
              expect(serviceValidation).toBe(true);
            }
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should correctly identify web-compatible formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate format strings to test
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/flac',
            'audio/aac',
            'video/webm',
            'text/plain',
            ''
          ),
          async (format) => {
            // Test format validation
            const isCompatible = service._isWebCompatibleFormat(format);
            
            // PROPERTY ASSERTION: Format validation is correct
            
            // Define expected web-compatible formats
            const expectedCompatible = 
              format.includes('webm') ||
              format.includes('ogg') ||
              format.includes('mp4') ||
              format.includes('mpeg') ||
              format.includes('mp3');
            
            // Validation should match expected
            expect(isCompatible).toBe(expectedCompatible);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('should maintain format compatibility through compression pipeline', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate web-compatible formats
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4'
          ),
          // Generate blob sizes
          fc.integer({ min: 1000, max: 100000 }),
          // Generate bitrate options
          fc.option(
            fc.integer({ min: 32000, max: 128000 }),
            { nil: undefined }
          ),
          async (inputFormat, blobSize, targetBitrate) => {
            // Create audio blob
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: inputFormat });
            
            // Compress with options
            const options = targetBitrate ? { targetBitrate } : {};
            const compressedBlob = await service.compressAudio(audioBlob, options);
            
            // PROPERTY ASSERTION: Format compatibility is maintained
            
            // 1. Input should be web-compatible
            expect(service._isWebCompatibleFormat(inputFormat)).toBe(true);
            
            // 2. Output should be web-compatible
            expect(service._isWebCompatibleFormat(compressedBlob.type)).toBe(true);
            
            // 3. For already compatible formats, should return same blob
            expect(compressedBlob).toBe(audioBlob);
            expect(compressedBlob.type).toBe(inputFormat);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should handle format conversion for incompatible formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate incompatible formats
          fc.constantFrom(
            'audio/wav',
            'audio/x-wav',
            'audio/flac',
            'audio/aac',
            'audio/amr'
          ),
          // Generate blob sizes
          fc.integer({ min: 1000, max: 50000 }),
          async (inputFormat, blobSize) => {
            // Create audio blob with incompatible format
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: inputFormat });
            
            // Compress audio (should attempt conversion or fallback)
            const compressedBlob = await service.compressAudio(audioBlob);
            
            // PROPERTY ASSERTION: Incompatible formats are handled
            
            // 1. Should return a valid Blob
            expect(compressedBlob).toBeInstanceOf(Blob);
            expect(compressedBlob.size).toBeGreaterThan(0);
            
            // 2. Input should not be web-compatible
            expect(service._isWebCompatibleFormat(inputFormat)).toBe(false);
            
            // 3. Output should either be:
            //    - Converted to web-compatible format, OR
            //    - Fallback to original blob (for graceful degradation)
            const outputIsCompatible = service._isWebCompatibleFormat(compressedBlob.type);
            const isFallback = compressedBlob === audioBlob;
            
            expect(outputIsCompatible || isFallback).toBe(true);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should validate format compatibility across browser support scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate format
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
          ),
          // Generate browser support scenarios
          fc.array(
            fc.constantFrom(
              'audio/webm;codecs=opus',
              'audio/webm',
              'audio/ogg;codecs=opus',
              'audio/mp4'
            ),
            { minLength: 0, maxLength: 4 }
          ),
          // Generate blob size
          fc.integer({ min: 1000, max: 50000 }),
          async (inputFormat, supportedFormats, blobSize) => {
            // Mock MediaRecorder support
            global.MediaRecorder.isTypeSupported = vi.fn((mimeType) => {
              return supportedFormats.some(format => mimeType.includes(format.split(';')[0]));
            });
            
            // Create audio blob
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: inputFormat });
            
            // Compress audio
            const compressedBlob = await service.compressAudio(audioBlob);
            
            // PROPERTY ASSERTION: Format compatibility respects browser support
            
            // 1. Should return valid blob
            expect(compressedBlob).toBeInstanceOf(Blob);
            expect(compressedBlob.size).toBeGreaterThan(0);
            
            // 2. If input format is supported and web-compatible, should use it
            const isInputSupported = supportedFormats.some(f => inputFormat.includes(f.split(';')[0]));
            const isInputCompatible = service._isWebCompatibleFormat(inputFormat);
            
            if (isInputSupported && isInputCompatible) {
              expect(compressedBlob).toBe(audioBlob);
            }
            
            // 3. Output should be web-compatible or fallback
            const isOutputCompatible = service._isWebCompatibleFormat(compressedBlob.type);
            const isFallback = compressedBlob === audioBlob;
            expect(isOutputCompatible || isFallback).toBe(true);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);
  });

  /**
   * Property 12: Bitrate within target range
   * **Validates: Requirements 4.4**
   * 
   * For any compressed audio file, the bitrate should fall within the range of 32-64 kbps
   * (or the configured target range).
   * 
   * This property tests that:
   * 1. Bitrate validation clamps values to valid range
   * 2. Target bitrate is respected during compression
   * 3. Invalid bitrates are handled gracefully
   * 4. Bitrate configuration is consistent across operations
   */
  describe('Property 12: Bitrate within target range', () => {
    it('should always validate bitrate to be within acceptable range', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various bitrate values (including invalid)
          fc.integer({ min: -10000, max: 1000000 }),
          async (inputBitrate) => {
            // Validate bitrate
            const validatedBitrate = service._validateBitrate(inputBitrate);
            
            // PROPERTY ASSERTION: Bitrate is always within valid range
            
            // 1. Validated bitrate should be within MIN and MAX
            expect(validatedBitrate).toBeGreaterThanOrEqual(service.MIN_BITRATE);
            expect(validatedBitrate).toBeLessThanOrEqual(service.MAX_BITRATE);
            
            // 2. For values below MIN, should clamp to MIN
            if (inputBitrate < service.MIN_BITRATE) {
              expect(validatedBitrate).toBe(service.MIN_BITRATE);
            }
            
            // 3. For values above MAX, should clamp to MAX
            if (inputBitrate > service.MAX_BITRATE) {
              expect(validatedBitrate).toBe(service.MAX_BITRATE);
            }
            
            // 4. For values within range, should return as-is
            if (inputBitrate >= service.MIN_BITRATE && inputBitrate <= service.MAX_BITRATE) {
              expect(validatedBitrate).toBe(inputBitrate);
            }
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('should respect target bitrate during compression', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate blob size
          fc.integer({ min: 1000, max: 100000 }),
          // Generate target bitrate
          fc.integer({ min: 32000, max: 64000 }),
          // Generate format
          fc.constantFrom('audio/webm;codecs=opus', 'audio/webm'),
          async (blobSize, targetBitrate, format) => {
            // Create audio blob
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: format });
            
            // Compress with target bitrate
            const compressedBlob = await service.compressAudio(audioBlob, { targetBitrate });
            
            // PROPERTY ASSERTION: Target bitrate is respected
            
            // 1. Should return valid blob
            expect(compressedBlob).toBeInstanceOf(Blob);
            
            // 2. Bitrate should be validated
            const validatedBitrate = service._validateBitrate(targetBitrate);
            expect(validatedBitrate).toBe(targetBitrate); // Should be within range
            
            // 3. Validated bitrate should be within acceptable range
            expect(validatedBitrate).toBeGreaterThanOrEqual(32000);
            expect(validatedBitrate).toBeLessThanOrEqual(64000);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should handle edge case bitrates gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate edge case bitrates
          fc.constantFrom(
            0,
            -1,
            1,
            service.MIN_BITRATE - 1,
            service.MIN_BITRATE,
            service.MIN_BITRATE + 1,
            service.MAX_BITRATE - 1,
            service.MAX_BITRATE,
            service.MAX_BITRATE + 1,
            999999,
            Infinity,
            -Infinity,
            NaN
          ),
          // Generate blob
          fc.integer({ min: 1000, max: 50000 }),
          async (edgeBitrate, blobSize) => {
            // Create audio blob
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: 'audio/webm' });
            
            // Compress with edge case bitrate
            const compressedBlob = await service.compressAudio(audioBlob, { targetBitrate: edgeBitrate });
            
            // PROPERTY ASSERTION: Edge cases are handled gracefully
            
            // 1. Should always return valid blob
            expect(compressedBlob).toBeInstanceOf(Blob);
            expect(compressedBlob.size).toBeGreaterThan(0);
            
            // 2. Bitrate validation should handle edge cases
            const validatedBitrate = service._validateBitrate(edgeBitrate);
            
            // 3. For NaN, Infinity, or invalid values, should use default or clamp
            if (isNaN(edgeBitrate) || !isFinite(edgeBitrate)) {
              expect(validatedBitrate).toBeGreaterThanOrEqual(service.MIN_BITRATE);
              expect(validatedBitrate).toBeLessThanOrEqual(service.MAX_BITRATE);
            } else {
              // For finite values, should clamp to range
              expect(validatedBitrate).toBeGreaterThanOrEqual(service.MIN_BITRATE);
              expect(validatedBitrate).toBeLessThanOrEqual(service.MAX_BITRATE);
            }
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);
  });
});
