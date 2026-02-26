import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatNotificationBody, createNotificationPayload } from './notifications.js';

describe('formatNotificationBody', () => {
  describe('reply messages', () => {
    it('formats notification with reply context for text message', async () => {
      const message = {
        id: 'msg-123',
        sender: 'A',
        type: 'text',
        text: 'This is my reply',
        reply_to_id: 'msg-original',
        reply_to_message: {
          id: 'msg-original',
          sender: 'B',
          type: 'text',
          text: 'Original message text',
          deleted: false
        }
      };

      const body = await formatNotificationBody(message);
      assert.strictEqual(body, 'User A replied to: Original message text');
    });

    it('truncates original message preview at 50 characters', async () => {
      const longText = 'a'.repeat(100);
      const message = {
        id: 'msg-123',
        sender: 'B',
        type: 'text',
        text: 'Reply',
        reply_to_id: 'msg-original',
        reply_to_message: {
          id: 'msg-original',
          sender: 'A',
          type: 'text',
          text: longText,
          deleted: false
        }
      };

      const body = await formatNotificationBody(message);
      // "User B replied to: " (20 chars) + 50 chars of 'a' + "..." (3 chars) - 1 (space) = 72 chars
      assert.strictEqual(body, `User B replied to: ${'a'.repeat(50)}...`);
      assert.strictEqual(body.length, 72);
    });

    it('formats notification for reply to image message', async () => {
      const message = {
        id: 'msg-123',
        sender: 'A',
        type: 'text',
        text: 'Nice photo!',
        reply_to_id: 'msg-original',
        reply_to_message: {
          id: 'msg-original',
          sender: 'B',
          type: 'image',
          image_path: '/path/to/image.jpg',
          deleted: false
        }
      };

      const body = await formatNotificationBody(message);
      assert.strictEqual(body, 'User A replied to: [Image]');
    });

    it('formats notification for reply to voice message', async () => {
      const message = {
        id: 'msg-123',
        sender: 'B',
        type: 'text',
        text: 'Got it',
        reply_to_id: 'msg-original',
        reply_to_message: {
          id: 'msg-original',
          sender: 'A',
          type: 'voice',
          audio_duration: 125,
          deleted: false
        }
      };

      const body = await formatNotificationBody(message);
      assert.strictEqual(body, 'User B replied to: [Voice message 2:05]');
    });

    it('formats notification for reply to deleted message', async () => {
      const message = {
        id: 'msg-123',
        sender: 'A',
        type: 'text',
        text: 'What did you say?',
        reply_to_id: 'msg-original',
        reply_to_message: {
          id: 'msg-original',
          sender: 'B',
          type: 'text',
          text: 'Original text',
          deleted: true
        }
      };

      const body = await formatNotificationBody(message);
      assert.strictEqual(body, 'User A replied to: [Message deleted]');
    });
  });

  describe('non-reply messages', () => {
    it('formats standard notification for text message', async () => {
      const message = {
        id: 'msg-123',
        sender: 'A',
        type: 'text',
        text: 'Hello there',
        reply_to_id: null,
        reply_to_message: null
      };

      const body = await formatNotificationBody(message);
      assert.strictEqual(body, 'User A: Hello there');
    });

    it('truncates message preview at 50 characters for non-reply', async () => {
      const longText = 'b'.repeat(100);
      const message = {
        id: 'msg-123',
        sender: 'B',
        type: 'text',
        text: longText,
        reply_to_id: null,
        reply_to_message: null
      };

      const body = await formatNotificationBody(message);
      assert.strictEqual(body, `User B: ${'b'.repeat(50)}...`);
    });

    it('formats notification for image message', async () => {
      const message = {
        id: 'msg-123',
        sender: 'A',
        type: 'image',
        image_path: '/path/to/image.jpg',
        reply_to_id: null,
        reply_to_message: null
      };

      const body = await formatNotificationBody(message);
      assert.strictEqual(body, 'User A: [Image]');
    });

    it('formats notification for voice message', async () => {
      const message = {
        id: 'msg-123',
        sender: 'B',
        type: 'voice',
        audio_duration: 65,
        reply_to_id: null,
        reply_to_message: null
      };

      const body = await formatNotificationBody(message);
      assert.strictEqual(body, 'User B: [Voice message 1:05]');
    });
  });
});

describe('createNotificationPayload', () => {
  it('creates payload with reply context', async () => {
    const message = {
      id: 'msg-123',
      sender: 'A',
      type: 'text',
      text: 'Reply text',
      reply_to_id: 'msg-original',
      reply_to_message: {
        id: 'msg-original',
        sender: 'B',
        type: 'text',
        text: 'Original',
        deleted: false
      }
    };

    const payload = await createNotificationPayload(message, 'B');
    
    assert.strictEqual(payload.title, 'New Message');
    assert.strictEqual(payload.body, 'User A replied to: Original');
    assert.strictEqual(payload.data.messageId, 'msg-123');
    assert.strictEqual(payload.data.sender, 'A');
    assert.strictEqual(payload.data.recipient, 'B');
    assert.strictEqual(payload.data.isReply, true);
    assert.strictEqual(payload.data.replyToId, 'msg-original');
  });

  it('creates payload for non-reply message', async () => {
    const message = {
      id: 'msg-456',
      sender: 'B',
      type: 'text',
      text: 'Hello',
      reply_to_id: null,
      reply_to_message: null
    };

    const payload = await createNotificationPayload(message, 'A');
    
    assert.strictEqual(payload.title, 'New Message');
    assert.strictEqual(payload.body, 'User B: Hello');
    assert.strictEqual(payload.data.messageId, 'msg-456');
    assert.strictEqual(payload.data.sender, 'B');
    assert.strictEqual(payload.data.recipient, 'A');
    assert.strictEqual(payload.data.isReply, false);
    assert.strictEqual(payload.data.replyToId, null);
  });
});
