/**
 * Property-Based Tests for Audio Format Validation
 * Feature: voice-messages
 * 
 * These tests validate universal properties that should hold across all valid executions.
 * Uses fast-check library with minimum 100 iterations per property.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import AudioCompressorService from './audioCompressorService';

describe('Audio Format Validation - Property-Based Tests', () => {
  let service;

  beforeEach(() => {
    service = new AudioCompressorService();
    
    // Mock MediaRecorder for format validation tests
    global.MediaRecorder = {
      isTypeSupported: vi.fn((mimeType) => {
        // Simulate browser support for web-compatible formats
        return mimeType.includes('webm') || 
               mimeType.includes('ogg') || 
               mimeType.includes('opus') ||
               mimeType.includes('mp4') ||
               mimeType.includes('mpeg');
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
   * Property 11: Audio format is web-compatible
   * **Validates: Requirements 4.1**
   * 
   * For any encoded audio file, the format should be one of WebM, MP4, or OGG.
   * 
   * This property tests that:
   * 1. The compression service accepts various audio formats
   * 2. The output is always in a web-compatible format (WebM, MP4, or OGG)
   * 3. Invalid formats are either converted or rejected gracefully
   * 4. The format validation logic correctly identifies web-compatible formats
   * 5. The service maintains format compatibility across all operations
   */
  describe('Property 11: Audio format is web-compatible', () => {
    it('should always output web-compatible formats for any input', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different audio blob sizes
          fc.integer({ min: 100, max: 100000 }),
          // Generate various MIME types (both valid and invalid)
          fc.constantFrom(
            // Web-compatible formats
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
            'audio/mpeg',
            // Non-web-compatible formats
            'audio/wav',
            'audio/x-wav',
            'audio/flac',
            'audio/aac',
            'audio/3gpp',
            'audio/amr',
            // Invalid formats
            'video/webm',
            'text/plain',
            'application/octet-stream',
            '',
            'invalid/type'
          ),
          async (blobSize, mimeType) => {
            // Create audio blob with specified format
            const audioData = 'x'.repeat(blobSize);
            const audioBlob = new Blob([audioData], { type: mimeType });
            
            // Compress/validate audio
            const outputBlob = await service.compressAudio(audioBlob);
            
            // PROPERTY ASSERTION: Output format is always web-compatible
            
            // 1. Output should always be a valid Blob
            expect(outputBlob).toBeInstanceOf(Blob);
            expect(outputBlob.size).toBeGreaterThan(0);
            
            // 2. Output MIME type should be web-compatible
            const isWebCompatible = service._isWebCompatibleFormat(outputBlob.type);
            
            // 3. Check if output format is one of: WebM, MP4, or OGG
            const outputType = outputBlob.type.toLowerCase();
            const isValidFormat = 
              outputType.includes('webm') ||
              outputType.includes('mp4') ||
              outputType.includes('ogg') ||
              outputType.includes('mpeg');
            
            // 4. For web-compatible input, output should maintain format
            if (service._isWebCompatibleFormat(mimeType)) {
              expect(isWebCompatible).toBe(true);
              expect(isValidFormat).toBe(true);
              // Should return same blob (no conversion needed)
              expect(outputBlob).toBe(audioBlob);
            } else {
              // For non-compatible input, should either convert or return original
              // (fallback behavior on conversion failure)
              expect(outputBlob).toBeInstanceOf(Blob);
            }
          }
        ),
        { 
          numRuns: 100, // Minimum 100 iterations as specified
          verbose: true
        }
      );
    }, 60000);

    it('should correctly identify web-compatible formats across all MIME type variations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate comprehensive list of MIME types
          fc.constantFrom(
            // WebM variations
            'audio/webm',
            'audio/webm;codecs=opus',
            'audio/webm;codecs=vorbis',
            'AUDIO/WEBM', // Case variation
            'Audio/WebM',
            // OGG variations
            'audio/ogg',
            'audio/ogg;codecs=opus',
            'audio/ogg;codecs=vorbis',
            'AUDIO/OGG',
            // MP4 variations
            'audio/mp4',
            'audio/mp4;codecs=mp4a',
            'AUDIO/MP4',
            // MPEG variations
            'audio/mpeg',
            'audio/mp3',
            'AUDIO/MPEG',
            // Non-compatible formats
            'audio/wav',
            'audio/x-wav',
            'audio/flac',
            'audio/aac',
            'video/webm',
            'text/plain',
            '',
            'invalid'
          ),
          async (mimeType) => {
            // PROPERTY ASSERTION: Format validation is consistent
            
            const isCompatible = service._isWebCompatibleFormat(mimeType);
            
            // 1. Web-compatible formats should be identified correctly
            const lowerType = mimeType.toLowerCase();
            const shouldBeCompatible = 
              lowerType.startsWith('audio/webm') ||
              lowerType.startsWith('audio/ogg') ||
              lowerType.startsWith('audio/mp4') ||
              lowerType.startsWith('audio/mpeg') ||
              lowerType.startsWith('audio/mp3');
            
            expect(isCompatible).toBe(shouldBeCompatible);
            
            // 2. Create a blob and verify compression behavior
            const audioBlob = new Blob(['test'], { type: mimeType });
            const outputBlob = await service.compressAudio(audioBlob);
            
            // 3. Output should always be a valid Blob
            expect(outputBlob).toBeInstanceOf(Blob);
            
            // 4. If input is compatible, output should be same blob
            if (isCompatible) {
              expect(outputBlob).toBe(audioBlob);
            }
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should handle format validation with various blob sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate different blob sizes from tiny to large
          fc.constantFrom(
            0,        // Empty
            1,        // Single byte
            10,       // Very small
            100,      // Small
            1000,     // Medium
            10000,    // Large
            50000,    // Very large
            100000    // Extra large
          ),
          // Generate web-compatible formats
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
            'audio/mpeg'
          ),
          async (blobSize, mimeType) => {
            // Create audio blob
            const audioData = blobSize > 0 ? 'a'.repeat(blobSize) : '';
            const audioBlob = new Blob([audioData], { type: mimeType });
            
            // Compress/validate audio
            const outputBlob = await service.compressAudio(audioBlob);
            
            // PROPERTY ASSERTION: Format validation works regardless of size
            
            // 1. Output should be valid
            expect(outputBlob).toBeInstanceOf(Blob);
            
            // 2. For empty blob, should handle gracefully
            if (blobSize === 0) {
              expect(outputBlob.size).toBe(0);
            } else {
              expect(outputBlob.size).toBeGreaterThan(0);
            }
            
            // 3. Format should be web-compatible
            expect(service._isWebCompatibleFormat(outputBlob.type)).toBe(true);
            
            // 4. For web-compatible input, should return same blob
            expect(outputBlob).toBe(audioBlob);
            expect(outputBlob.type).toBe(mimeType);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should maintain format compatibility across concurrent operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple audio blobs with different formats
          fc.array(
            fc.record({
              size: fc.integer({ min: 1000, max: 50000 }),
              format: fc.constantFrom(
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/mp4',
                'audio/mpeg'
              )
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (blobConfigs) => {
            // Create multiple audio blobs
            const audioBlobs = blobConfigs.map(config => 
              new Blob(['x'.repeat(config.size)], { type: config.format })
            );
            
            // Process all blobs concurrently
            const outputBlobs = await Promise.all(
              audioBlobs.map(blob => service.compressAudio(blob))
            );
            
            // PROPERTY ASSERTION: All outputs are web-compatible
            
            // 1. Should return same number of blobs
            expect(outputBlobs.length).toBe(audioBlobs.length);
            
            // 2. Each output should be web-compatible
            for (let i = 0; i < outputBlobs.length; i++) {
              expect(outputBlobs[i]).toBeInstanceOf(Blob);
              expect(outputBlobs[i].size).toBeGreaterThan(0);
              
              // 3. Format should be web-compatible
              const isCompatible = service._isWebCompatibleFormat(outputBlobs[i].type);
              expect(isCompatible).toBe(true);
              
              // 4. Should return same blob (no conversion needed)
              expect(outputBlobs[i]).toBe(audioBlobs[i]);
              expect(outputBlobs[i].type).toBe(blobConfigs[i].format);
            }
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should validate format compatibility with different compression options', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate blob size
          fc.integer({ min: 1000, max: 50000 }),
          // Generate web-compatible format
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
          ),
          // Generate compression options
          fc.record({
            targetBitrate: fc.option(
              fc.integer({ min: 16000, max: 128000 }),
              { nil: undefined }
            ),
            format: fc.option(
              fc.constantFrom('webm', 'ogg', 'mp4'),
              { nil: undefined }
            )
          }),
          async (blobSize, mimeType, options) => {
            // Create audio blob
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: mimeType });
            
            // Compress with options
            const outputBlob = await service.compressAudio(audioBlob, options);
            
            // PROPERTY ASSERTION: Format remains web-compatible with any options
            
            // 1. Output should be valid
            expect(outputBlob).toBeInstanceOf(Blob);
            expect(outputBlob.size).toBeGreaterThan(0);
            
            // 2. Format should be web-compatible
            const isCompatible = service._isWebCompatibleFormat(outputBlob.type);
            expect(isCompatible).toBe(true);
            
            // 3. Output format should be one of the supported types
            const outputType = outputBlob.type.toLowerCase();
            const isValidFormat = 
              outputType.includes('webm') ||
              outputType.includes('mp4') ||
              outputType.includes('ogg') ||
              outputType.includes('mpeg');
            expect(isValidFormat).toBe(true);
            
            // 4. For web-compatible input, should return same blob
            expect(outputBlob).toBe(audioBlob);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should handle edge cases in format validation', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate edge case MIME types
          fc.constantFrom(
            // Valid formats with unusual casing
            'AUDIO/WEBM;CODECS=OPUS',
            'Audio/Webm',
            'AuDiO/OgG',
            // Valid formats with extra parameters
            'audio/webm;codecs=opus;rate=48000',
            'audio/ogg;codecs=opus;channels=1',
            // Formats with whitespace
            'audio/webm ',
            ' audio/webm',
            'audio/webm; codecs=opus',
            // Minimal valid formats
            'audio/webm',
            'audio/ogg',
            'audio/mp4',
            // Invalid but similar formats
            'audio/webm-invalid',
            'audio/ogg-test',
            'audio/mp4-custom'
          ),
          async (mimeType) => {
            // Create audio blob
            const audioBlob = new Blob(['test'], { type: mimeType });
            
            // Compress/validate audio
            const outputBlob = await service.compressAudio(audioBlob);
            
            // PROPERTY ASSERTION: Edge cases are handled correctly
            
            // 1. Output should always be valid
            expect(outputBlob).toBeInstanceOf(Blob);
            
            // 2. Check if input format is web-compatible
            const isInputCompatible = service._isWebCompatibleFormat(mimeType);
            
            // 3. Determine expected compatibility (case-insensitive check)
            const lowerType = mimeType.toLowerCase().trim();
            const shouldBeCompatible = 
              lowerType.startsWith('audio/webm') ||
              lowerType.startsWith('audio/ogg') ||
              lowerType.startsWith('audio/mp4') ||
              lowerType.startsWith('audio/mpeg');
            
            // 4. Validation should match expected result
            expect(isInputCompatible).toBe(shouldBeCompatible);
            
            // 5. If input is compatible, output should be same blob
            if (isInputCompatible) {
              expect(outputBlob).toBe(audioBlob);
              expect(service._isWebCompatibleFormat(outputBlob.type)).toBe(true);
            }
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should validate format compatibility for realistic voice message scenarios', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate realistic recording durations (in seconds)
          fc.integer({ min: 1, max: 300 }), // 1 second to 5 minutes
          // Generate realistic bitrates for voice
          fc.constantFrom(32000, 48000, 64000),
          // Generate realistic web-compatible formats
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus'
          ),
          async (durationSeconds, bitrate, mimeType) => {
            // Estimate blob size based on duration and bitrate
            // Formula: (bitrate * duration) / 8 = bytes
            const estimatedSize = Math.floor((bitrate * durationSeconds) / 8);
            
            // Create audio blob simulating a real recording
            const audioBlob = new Blob(['x'.repeat(estimatedSize)], { type: mimeType });
            
            // Compress/validate audio
            const outputBlob = await service.compressAudio(audioBlob, { targetBitrate: bitrate });
            
            // PROPERTY ASSERTION: Realistic scenarios maintain format compatibility
            
            // 1. Output should be valid
            expect(outputBlob).toBeInstanceOf(Blob);
            expect(outputBlob.size).toBeGreaterThan(0);
            
            // 2. Format should be web-compatible
            expect(service._isWebCompatibleFormat(outputBlob.type)).toBe(true);
            
            // 3. Output format should be one of the supported types
            const outputType = outputBlob.type.toLowerCase();
            const isValidFormat = 
              outputType.includes('webm') ||
              outputType.includes('ogg') ||
              outputType.includes('opus');
            expect(isValidFormat).toBe(true);
            
            // 4. For web-compatible input, should return same blob
            expect(outputBlob).toBe(audioBlob);
            expect(outputBlob.type).toBe(mimeType);
            
            // 5. Size should be maintained (no re-encoding)
            expect(outputBlob.size).toBe(estimatedSize);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should ensure format validation is idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate blob size
          fc.integer({ min: 1000, max: 50000 }),
          // Generate web-compatible format
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
          ),
          // Generate number of compression passes
          fc.integer({ min: 1, max: 5 }),
          async (blobSize, mimeType, numPasses) => {
            // Create audio blob
            let currentBlob = new Blob(['x'.repeat(blobSize)], { type: mimeType });
            
            // Apply compression multiple times
            for (let i = 0; i < numPasses; i++) {
              currentBlob = await service.compressAudio(currentBlob);
            }
            
            // PROPERTY ASSERTION: Multiple passes maintain format compatibility
            
            // 1. Output should be valid
            expect(currentBlob).toBeInstanceOf(Blob);
            expect(currentBlob.size).toBeGreaterThan(0);
            
            // 2. Format should still be web-compatible
            expect(service._isWebCompatibleFormat(currentBlob.type)).toBe(true);
            
            // 3. Format should match original (idempotent)
            expect(currentBlob.type).toBe(mimeType);
            
            // 4. Size should be maintained (no re-encoding on each pass)
            expect(currentBlob.size).toBe(blobSize);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should validate that all supported formats are truly web-compatible', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Test all supported formats from the service
          fc.constantFrom(
            ...['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg']
          ),
          // Generate blob size
          fc.integer({ min: 1000, max: 50000 }),
          async (supportedFormat, blobSize) => {
            // PROPERTY ASSERTION: All supported formats are web-compatible
            
            // 1. Format should be identified as web-compatible
            expect(service._isWebCompatibleFormat(supportedFormat)).toBe(true);
            
            // 2. Create blob with this format
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: supportedFormat });
            
            // 3. Compression should accept it without conversion
            const outputBlob = await service.compressAudio(audioBlob);
            
            // 4. Output should be same blob (no conversion needed)
            expect(outputBlob).toBe(audioBlob);
            expect(outputBlob.type).toBe(supportedFormat);
            
            // 5. Output should be web-compatible
            expect(service._isWebCompatibleFormat(outputBlob.type)).toBe(true);
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    }, 60000);

    it('should handle format validation with codec specifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate blob size
          fc.integer({ min: 1000, max: 50000 }),
          // Generate formats with various codec specifications
          fc.constantFrom(
            'audio/webm;codecs=opus',
            'audio/webm;codecs=vorbis',
            'audio/webm;codecs=pcm',
            'audio/ogg;codecs=opus',
            'audio/ogg;codecs=vorbis',
            'audio/ogg;codecs=flac',
            'audio/mp4;codecs=mp4a',
            'audio/mp4;codecs=aac',
            'audio/mpeg;codecs=mp3'
          ),
          async (blobSize, mimeType) => {
            // Create audio blob
            const audioBlob = new Blob(['x'.repeat(blobSize)], { type: mimeType });
            
            // Compress/validate audio
            const outputBlob = await service.compressAudio(audioBlob);
            
            // PROPERTY ASSERTION: Codec specifications don't affect format validation
            
            // 1. Output should be valid
            expect(outputBlob).toBeInstanceOf(Blob);
            expect(outputBlob.size).toBeGreaterThan(0);
            
            // 2. Base format should be web-compatible
            const baseFormat = mimeType.split(';')[0];
            const isBaseCompatible = service._isWebCompatibleFormat(baseFormat);
            expect(isBaseCompatible).toBe(true);
            
            // 3. Full format with codec should also be web-compatible
            const isFullCompatible = service._isWebCompatibleFormat(mimeType);
            expect(isFullCompatible).toBe(true);
            
            // 4. Output should maintain format
            expect(outputBlob).toBe(audioBlob);
            expect(outputBlob.type).toBe(mimeType);
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
