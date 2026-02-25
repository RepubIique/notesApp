import { describe, it, beforeEach } from 'vitest';
import { expect } from 'vitest';
import AudioRecorderService from './audioRecorderService';

describe('AudioRecorderService - Format Detection', () => {
  let service;

  beforeEach(() => {
    service = new AudioRecorderService();
  });

  it('should detect Safari and use MP4 format', () => {
    // Mock Safari user agent
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
      configurable: true
    });

    // Mock MediaRecorder.isTypeSupported
    const originalIsTypeSupported = MediaRecorder.isTypeSupported;
    MediaRecorder.isTypeSupported = (mimeType) => {
      return mimeType === 'audio/mp4';
    };

    const options = service._getMediaRecorderOptions();
    
    expect(options.mimeType).toBe('audio/mp4');
    expect(options.audioBitsPerSecond).toBe(48000);

    // Restore
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
    MediaRecorder.isTypeSupported = originalIsTypeSupported;
  });

  it('should detect Chrome and use WebM format', () => {
    // Mock Chrome user agent
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      configurable: true
    });

    // Mock MediaRecorder.isTypeSupported
    const originalIsTypeSupported = MediaRecorder.isTypeSupported;
    MediaRecorder.isTypeSupported = (mimeType) => {
      return mimeType.includes('webm');
    };

    const options = service._getMediaRecorderOptions();
    
    expect(options.mimeType).toContain('webm');
    expect(options.audioBitsPerSecond).toBe(48000);

    // Restore
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
    MediaRecorder.isTypeSupported = originalIsTypeSupported;
  });

  it('should fallback to browser default if no format is supported', () => {
    // Mock MediaRecorder.isTypeSupported to reject all formats
    const originalIsTypeSupported = MediaRecorder.isTypeSupported;
    MediaRecorder.isTypeSupported = () => false;

    const options = service._getMediaRecorderOptions();
    
    expect(options).toEqual({});

    // Restore
    MediaRecorder.isTypeSupported = originalIsTypeSupported;
  });
});
