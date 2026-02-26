import { describe, it, expect } from 'vitest';
import { generateContentPreview, getSenderDisplayName } from './messageUtils';

describe('generateContentPreview', () => {
  describe('deleted messages', () => {
    it('returns "[Message deleted]" for deleted text message', () => {
      const message = {
        type: 'text',
        text: 'Original text',
        deleted: true
      };
      expect(generateContentPreview(message)).toBe('[Message deleted]');
    });

    it('returns "[Message deleted]" for deleted image message', () => {
      const message = {
        type: 'image',
        deleted: true
      };
      expect(generateContentPreview(message)).toBe('[Message deleted]');
    });

    it('returns "[Message deleted]" for deleted voice message', () => {
      const message = {
        type: 'voice',
        audio_duration: 45,
        deleted: true
      };
      expect(generateContentPreview(message)).toBe('[Message deleted]');
    });
  });

  describe('text messages', () => {
    it('returns full text for short messages', () => {
      const message = {
        type: 'text',
        text: 'Hello world',
        deleted: false
      };
      expect(generateContentPreview(message)).toBe('Hello world');
    });

    it('truncates text at 100 characters by default', () => {
      const longText = 'a'.repeat(150);
      const message = {
        type: 'text',
        text: longText,
        deleted: false
      };
      const preview = generateContentPreview(message);
      expect(preview).toBe('a'.repeat(100) + '...');
      expect(preview.length).toBe(103); // 100 chars + '...'
    });

    it('respects custom maxLength parameter', () => {
      const message = {
        type: 'text',
        text: 'This is a longer message that should be truncated',
        deleted: false
      };
      const preview = generateContentPreview(message, 20);
      expect(preview).toBe('This is a longer mes...');
      expect(preview.length).toBe(23); // 20 chars + '...'
    });

    it('handles exactly 100 characters without truncation', () => {
      const exactText = 'a'.repeat(100);
      const message = {
        type: 'text',
        text: exactText,
        deleted: false
      };
      expect(generateContentPreview(message)).toBe(exactText);
    });

    it('returns "[Message]" for text message with null text', () => {
      const message = {
        type: 'text',
        text: null,
        deleted: false
      };
      expect(generateContentPreview(message)).toBe('[Message]');
    });

    it('returns "[Message]" for text message with undefined text', () => {
      const message = {
        type: 'text',
        deleted: false
      };
      expect(generateContentPreview(message)).toBe('[Message]');
    });
  });

  describe('image messages', () => {
    it('returns "[Image]" for image message', () => {
      const message = {
        type: 'image',
        deleted: false
      };
      expect(generateContentPreview(message)).toBe('[Image]');
    });
  });

  describe('voice messages', () => {
    it('formats voice message with duration in MM:SS format', () => {
      const message = {
        type: 'voice',
        audio_duration: 125, // 2 minutes 5 seconds
        deleted: false
      };
      expect(generateContentPreview(message)).toBe('[Voice message 2:05]');
    });

    it('pads seconds with leading zero', () => {
      const message = {
        type: 'voice',
        audio_duration: 65, // 1 minute 5 seconds
        deleted: false
      };
      expect(generateContentPreview(message)).toBe('[Voice message 1:05]');
    });

    it('handles zero duration', () => {
      const message = {
        type: 'voice',
        audio_duration: 0,
        deleted: false
      };
      expect(generateContentPreview(message)).toBe('[Voice message 0:00]');
    });

    it('handles null duration', () => {
      const message = {
        type: 'voice',
        audio_duration: null,
        deleted: false
      };
      expect(generateContentPreview(message)).toBe('[Voice message 0:00]');
    });

    it('handles undefined duration', () => {
      const message = {
        type: 'voice',
        deleted: false
      };
      expect(generateContentPreview(message)).toBe('[Voice message 0:00]');
    });

    it('handles long duration correctly', () => {
      const message = {
        type: 'voice',
        audio_duration: 3599, // 59 minutes 59 seconds
        deleted: false
      };
      expect(generateContentPreview(message)).toBe('[Voice message 59:59]');
    });
  });

  describe('unknown message types', () => {
    it('returns "[Message]" for unknown type', () => {
      const message = {
        type: 'unknown',
        deleted: false
      };
      expect(generateContentPreview(message)).toBe('[Message]');
    });
  });
});

describe('getSenderDisplayName', () => {
  it('returns "You" when sender matches current user role', () => {
    expect(getSenderDisplayName('A', 'A')).toBe('You');
    expect(getSenderDisplayName('B', 'B')).toBe('You');
  });

  it('returns "Them" when sender does not match current user role', () => {
    expect(getSenderDisplayName('A', 'B')).toBe('Them');
    expect(getSenderDisplayName('B', 'A')).toBe('Them');
  });
});
