/**
 * Unit tests for AudioCompressorService
 * 
 * Tests format validation, bitrate configuration, and compression behavior.
 * Requirements: 2.1, 4.1, 4.2, 4.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import AudioCompressorService from './audioCompressorService';

describe('AudioCompressorService', () => {
  let service;

  beforeEach(() => {
    service = new AudioCompressorService();
  });

  describe('constructor', () => {
    it('should initialize with correct bitrate range', () => {
      expect(service.MIN_BITRATE).toBe(32000);
      expect(service.MAX_BITRATE).toBe(64000);
      expect(service.DEFAULT_BITRATE).toBe(48000);
    });

    it('should initialize with supported formats', () => {
      expect(service.SUPPORTED_FORMATS).toContain('audio/webm');
      expect(service.SUPPORTED_FORMATS).toContain('audio/mp4');
      expect(service.SUPPORTED_FORMATS).toContain('audio/ogg');
      expect(service.SUPPORTED_FORMATS).toContain('audio/mpeg');
    });
  });

  describe('compressAudio', () => {
    it('should accept valid audio blob and return a blob', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      const result = await service.compressAudio(audioBlob);
      
      expect(result).toBeInstanceOf(Blob);
    });

    it('should return original blob for web-compatible format', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });
      
      const result = await service.compressAudio(audioBlob);
      
      expect(result).toBe(audioBlob);
    });

    it('should handle invalid input gracefully', async () => {
      const result = await service.compressAudio(null);
      
      expect(result).toBeNull();
    });

    it('should handle non-blob input gracefully', async () => {
      const result = await service.compressAudio('not a blob');
      
      expect(result).toBe('not a blob');
    });

    it('should use default bitrate when not specified', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const validateBitrateSpy = vi.spyOn(service, '_validateBitrate');
      
      await service.compressAudio(audioBlob);
      
      expect(validateBitrateSpy).toHaveBeenCalledWith(service.DEFAULT_BITRATE);
    });

    it('should use custom bitrate when specified', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const validateBitrateSpy = vi.spyOn(service, '_validateBitrate');
      const customBitrate = 40000;
      
      await service.compressAudio(audioBlob, { targetBitrate: customBitrate });
      
      expect(validateBitrateSpy).toHaveBeenCalledWith(customBitrate);
    });

    it('should fallback to original blob on compression failure', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      // Mock _isWebCompatibleFormat to throw an error
      vi.spyOn(service, '_isWebCompatibleFormat').mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = await service.compressAudio(audioBlob);
      
      expect(result).toBe(audioBlob);
    });
  });

  describe('_validateBitrate', () => {
    it('should return bitrate within valid range', () => {
      const result = service._validateBitrate(48000);
      
      expect(result).toBe(48000);
    });

    it('should clamp bitrate below minimum to MIN_BITRATE', () => {
      const result = service._validateBitrate(16000);
      
      expect(result).toBe(service.MIN_BITRATE);
    });

    it('should clamp bitrate above maximum to MAX_BITRATE', () => {
      const result = service._validateBitrate(128000);
      
      expect(result).toBe(service.MAX_BITRATE);
    });

    it('should handle non-number input', () => {
      const result = service._validateBitrate('not a number');
      
      expect(result).toBe(service.MIN_BITRATE);
    });

    it('should handle negative bitrate', () => {
      const result = service._validateBitrate(-1000);
      
      expect(result).toBe(service.MIN_BITRATE);
    });

    it('should handle zero bitrate', () => {
      const result = service._validateBitrate(0);
      
      expect(result).toBe(service.MIN_BITRATE);
    });

    it('should accept bitrate at minimum boundary', () => {
      const result = service._validateBitrate(32000);
      
      expect(result).toBe(32000);
    });

    it('should accept bitrate at maximum boundary', () => {
      const result = service._validateBitrate(64000);
      
      expect(result).toBe(64000);
    });
  });

  describe('_isWebCompatibleFormat', () => {
    it('should return true for audio/webm', () => {
      const result = service._isWebCompatibleFormat('audio/webm');
      
      expect(result).toBe(true);
    });

    it('should return true for audio/webm with codec', () => {
      const result = service._isWebCompatibleFormat('audio/webm;codecs=opus');
      
      expect(result).toBe(true);
    });

    it('should return true for audio/mp4', () => {
      const result = service._isWebCompatibleFormat('audio/mp4');
      
      expect(result).toBe(true);
    });

    it('should return true for audio/ogg', () => {
      const result = service._isWebCompatibleFormat('audio/ogg');
      
      expect(result).toBe(true);
    });

    it('should return true for audio/mpeg', () => {
      const result = service._isWebCompatibleFormat('audio/mpeg');
      
      expect(result).toBe(true);
    });

    it('should return false for unsupported format', () => {
      const result = service._isWebCompatibleFormat('audio/wav');
      
      expect(result).toBe(false);
    });

    it('should return false for null mime type', () => {
      const result = service._isWebCompatibleFormat(null);
      
      expect(result).toBe(false);
    });

    it('should return false for undefined mime type', () => {
      const result = service._isWebCompatibleFormat(undefined);
      
      expect(result).toBe(false);
    });

    it('should return false for empty string', () => {
      const result = service._isWebCompatibleFormat('');
      
      expect(result).toBe(false);
    });

    it('should handle case-insensitive matching', () => {
      const result = service._isWebCompatibleFormat('AUDIO/WEBM');
      
      expect(result).toBe(true);
    });
  });

  describe('_getBestSupportedMimeType', () => {
    beforeEach(() => {
      // Mock MediaRecorder.isTypeSupported
      global.MediaRecorder = {
        isTypeSupported: vi.fn((mimeType) => {
          // Simulate browser support for common formats
          return mimeType.includes('webm') || mimeType.includes('ogg');
        })
      };
    });

    it('should return a supported mime type', () => {
      const result = service._getBestSupportedMimeType('webm', 48000);
      
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should prioritize webm format when requested', () => {
      const result = service._getBestSupportedMimeType('webm', 48000);
      
      expect(result).toContain('webm');
    });

    it('should prioritize ogg format when requested', () => {
      const result = service._getBestSupportedMimeType('ogg', 48000);
      
      expect(result).toContain('ogg');
    });

    it('should return null when no format is supported', () => {
      global.MediaRecorder.isTypeSupported = vi.fn(() => false);
      
      const result = service._getBestSupportedMimeType('webm', 48000);
      
      expect(result).toBeNull();
    });
  });

  describe('getCompressionStats', () => {
    it('should calculate compression statistics correctly', () => {
      const originalBlob = new Blob(['x'.repeat(1000)]);
      const compressedBlob = new Blob(['x'.repeat(500)]);
      
      const stats = service.getCompressionStats(originalBlob, compressedBlob);
      
      expect(stats.originalSize).toBe(1000);
      expect(stats.compressedSize).toBe(500);
      expect(stats.compressionRatio).toBe('0.50');
      expect(stats.savedBytes).toBe(500);
      expect(stats.savedPercentage).toBe('50.00%');
    });

    it('should handle no compression (same size)', () => {
      const originalBlob = new Blob(['x'.repeat(1000)]);
      const compressedBlob = new Blob(['x'.repeat(1000)]);
      
      const stats = service.getCompressionStats(originalBlob, compressedBlob);
      
      expect(stats.compressionRatio).toBe('1.00');
      expect(stats.savedBytes).toBe(0);
      expect(stats.savedPercentage).toBe('0.00%');
    });

    it('should handle larger compressed size', () => {
      const originalBlob = new Blob(['x'.repeat(500)]);
      const compressedBlob = new Blob(['x'.repeat(1000)]);
      
      const stats = service.getCompressionStats(originalBlob, compressedBlob);
      
      expect(stats.compressionRatio).toBe('2.00');
      expect(stats.savedBytes).toBe(-500);
    });

    it('should handle zero-size blobs', () => {
      const originalBlob = new Blob([]);
      const compressedBlob = new Blob([]);
      
      const stats = service.getCompressionStats(originalBlob, compressedBlob);
      
      expect(stats.compressionRatio).toBe('1.00');
      expect(stats.savedPercentage).toBe('0.00%');
    });
  });

  describe('format conversion', () => {
    it('should warn about unsupported formats', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });
      
      await service.compressAudio(audioBlob);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported audio format')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should attempt conversion for unsupported formats', async () => {
      const audioBlob = new Blob(['audio data'], { type: 'audio/wav' });
      const convertFormatSpy = vi.spyOn(service, '_convertFormat');
      
      await service.compressAudio(audioBlob);
      
      expect(convertFormatSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should log errors and return original blob', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      // Force an error
      vi.spyOn(service, '_isWebCompatibleFormat').mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = await service.compressAudio(audioBlob);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Audio compression failed:',
        expect.any(Error)
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith('Falling back to original audio blob');
      expect(result).toBe(audioBlob);
      
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });
});
