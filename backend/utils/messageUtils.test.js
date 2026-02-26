import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateContentPreview, getSenderDisplayName } from './messageUtils.js';

describe('generateContentPreview', () => {
  describe('deleted messages', () => {
    it('returns "[Message deleted]" for deleted text message', () => {
      const message = {
        type: 'text',
        text: 'Some text',
        deleted: true
      };
      assert.strictEqual(generateContentPreview(message), '[Message deleted]');
    });

    it('returns "[Message deleted]" for deleted image message', () => {
      const message = {
        type: 'image',
        deleted: true
      };
      assert.strictEqual(generateContentPreview(message), '[Message deleted]');
    });

    it('returns "[Message deleted]" for deleted voice message', () => {
      const message = {
        type: 'voice',
        audio_duration: 60,
        deleted: true
      };
      assert.strictEqual(generateContentPreview(message), '[Message deleted]');
    });
  });

  describe('text messages', () => {
    it('returns full text for short messages', () => {
      const message = {
        type: 'text',
        text: 'Hello world',
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), 'Hello world');
    });

    it('truncates text at maxLength and appends "..."', () => {
      const message = {
        type: 'text',
        text: 'a'.repeat(150),
        deleted: false
      };
      const preview = generateContentPreview(message);
      assert.strictEqual(preview, 'a'.repeat(100) + '...');
      assert.strictEqual(preview.length, 103);
    });

    it('respects custom maxLength parameter', () => {
      const message = {
        type: 'text',
        text: 'This is a longer message that should be truncated',
        deleted: false
      };
      const preview = generateContentPreview(message, 20);
      assert.strictEqual(preview, 'This is a longer mes...');
      assert.strictEqual(preview.length, 23);
    });

    it('returns text as-is when exactly at maxLength', () => {
      const exactText = 'a'.repeat(100);
      const message = {
        type: 'text',
        text: exactText,
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), exactText);
    });

    it('returns "[Message]" for text message with null text', () => {
      const message = {
        type: 'text',
        text: null,
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), '[Message]');
    });

    it('returns "[Message]" for text message with undefined text', () => {
      const message = {
        type: 'text',
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), '[Message]');
    });
  });

  describe('image messages', () => {
    it('returns "[Image]" for image messages', () => {
      const message = {
        type: 'image',
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), '[Image]');
    });
  });

  describe('voice messages', () => {
    it('formats voice message with duration', () => {
      const message = {
        type: 'voice',
        audio_duration: 125,
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), '[Voice message 2:05]');
    });

    it('formats voice message with single digit seconds', () => {
      const message = {
        type: 'voice',
        audio_duration: 65,
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), '[Voice message 1:05]');
    });

    it('handles zero duration', () => {
      const message = {
        type: 'voice',
        audio_duration: 0,
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), '[Voice message 0:00]');
    });

    it('handles null duration', () => {
      const message = {
        type: 'voice',
        audio_duration: null,
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), '[Voice message 0:00]');
    });

    it('handles undefined duration', () => {
      const message = {
        type: 'voice',
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), '[Voice message 0:00]');
    });

    it('formats long duration correctly', () => {
      const message = {
        type: 'voice',
        audio_duration: 3599,
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), '[Voice message 59:59]');
    });
  });

  describe('unknown message types', () => {
    it('returns "[Message]" for unknown type', () => {
      const message = {
        type: 'unknown',
        deleted: false
      };
      assert.strictEqual(generateContentPreview(message), '[Message]');
    });
  });
});

describe('getSenderDisplayName', () => {
  it('returns "User A" for sender A', () => {
    assert.strictEqual(getSenderDisplayName('A'), 'User A');
  });

  it('returns "User B" for sender B', () => {
    assert.strictEqual(getSenderDisplayName('B'), 'User B');
  });
});
