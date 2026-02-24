// Set up test environment variables BEFORE any imports
import dotenv from 'dotenv';
dotenv.config(); // Load from .env file first

// Set test environment
process.env.NODE_ENV = 'test';

// Override with test-specific values
process.env.HASH_SALT = process.env.HASH_SALT || '10';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-e2e-testing';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { hashPassword } from './services/auth.js';
import { supabase } from './config/supabase.js';
import app from './server.js';

// Set up password hashes after importing hashPassword
process.env.PASSWORD_A_HASH = hashPassword('password-a', process.env.HASH_SALT);
process.env.PASSWORD_B_HASH = hashPassword('password-b', process.env.HASH_SALT);

describe('End-to-End Flows', () => {
  let tokenA;
  let tokenB;
  let messageIdFromA;
  let messageIdFromB;
  let imageMessageId;
  const testMessageIds = []; // Track all test message IDs for cleanup

  // Note: server.js automatically starts listening on import
  // The tests use the running server instance

  // Cleanup after all tests complete
  after(async () => {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Delete all messages created during tests (cascade deletes reactions, translations, etc.)
      const { error } = await supabase
        .from('messages')
        .delete()
        .in('id', testMessageIds);

      if (error) {
        console.error('❌ Error cleaning up test messages:', error);
      } else {
        console.log(`✅ Cleaned up ${testMessageIds.length} test messages`);
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  });

  describe('1. Login as A and B', () => {
    it('should successfully login as identity A', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password-a' });
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.role, 'A');
      
      // Extract token from cookie
      const cookies = response.headers['set-cookie'];
      assert.ok(cookies);
      const tokenCookie = cookies.find(c => c.startsWith('token='));
      assert.ok(tokenCookie);
      tokenA = tokenCookie.split(';')[0].split('=')[1];
      assert.ok(tokenA);
    });

    it('should successfully login as identity B', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password-b' });
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.role, 'B');
      
      // Extract token from cookie
      const cookies = response.headers['set-cookie'];
      assert.ok(cookies);
      const tokenCookie = cookies.find(c => c.startsWith('token='));
      assert.ok(tokenCookie);
      tokenB = tokenCookie.split(';')[0].split('=')[1];
      assert.ok(tokenB);
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'wrong-password' });
      
      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.body.error, 'Invalid password');
    });
  });

  describe('2. Session Persistence', () => {
    it('should maintain session for identity A across requests', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`token=${tokenA}`]);
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.role, 'A');
    });

    it('should maintain session for identity B across requests', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`token=${tokenB}`]);
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.role, 'B');
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me');
      
      assert.strictEqual(response.status, 401);
    });
  });

  describe('3. Sending Text Messages', () => {
    it('should allow identity A to send a text message', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Cookie', [`token=${tokenA}`])
        .send({ text: 'Hello from A!' });
      
      assert.strictEqual(response.status, 201);
      assert.ok(response.body.message);
      assert.strictEqual(response.body.message.sender, 'A');
      assert.strictEqual(response.body.message.type, 'text');
      assert.strictEqual(response.body.message.text, 'Hello from A!');
      assert.strictEqual(response.body.message.deleted, false);
      
      messageIdFromA = response.body.message.id;
      testMessageIds.push(messageIdFromA); // Track for cleanup
    });

    it('should allow identity B to send a text message', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Cookie', [`token=${tokenB}`])
        .send({ text: 'Hello from B!' });
      
      assert.strictEqual(response.status, 201);
      assert.ok(response.body.message);
      assert.strictEqual(response.body.message.sender, 'B');
      assert.strictEqual(response.body.message.type, 'text');
      assert.strictEqual(response.body.message.text, 'Hello from B!');
      
      messageIdFromB = response.body.message.id;
      testMessageIds.push(messageIdFromB); // Track for cleanup
    });

    it('should retrieve messages in newest-first order', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Cookie', [`token=${tokenA}`]);
      
      assert.strictEqual(response.status, 200);
      assert.ok(Array.isArray(response.body.messages));
      assert.ok(response.body.messages.length >= 2);
      
      // Verify newest-first ordering
      const messages = response.body.messages;
      for (let i = 0; i < messages.length - 1; i++) {
        const current = new Date(messages[i].created_at);
        const next = new Date(messages[i + 1].created_at);
        assert.ok(current >= next, 'Messages should be in newest-first order');
      }
    });

    it('should reject empty text messages', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Cookie', [`token=${tokenA}`])
        .send({ text: '' });
      
      assert.strictEqual(response.status, 400);
    });
  });

  describe('4. Uploading Images', () => {
    it('should allow identity A to upload an image', async () => {
      // Create a minimal test image buffer (1x1 PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);

      const response = await request(app)
        .post('/api/images')
        .set('Cookie', [`token=${tokenA}`])
        .attach('image', testImageBuffer, 'test-image.png');
      
      assert.strictEqual(response.status, 201);
      assert.ok(response.body.message);
      assert.strictEqual(response.body.message.sender, 'A');
      assert.strictEqual(response.body.message.type, 'image');
      assert.ok(response.body.message.image_path);
      assert.ok(response.body.message.image_name);
      assert.ok(response.body.message.image_mime);
      
      imageMessageId = response.body.message.id;
      testMessageIds.push(imageMessageId); // Track for cleanup
    });

    it('should retrieve image URL for image message', async () => {
      const response = await request(app)
        .get(`/api/images/${imageMessageId}`)
        .set('Cookie', [`token=${tokenA}`]);
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.url);
      assert.ok(typeof response.body.url === 'string');
    });

    it('should reject non-image files', async () => {
      const textBuffer = Buffer.from('This is not an image');

      const response = await request(app)
        .post('/api/images')
        .set('Cookie', [`token=${tokenA}`])
        .attach('image', textBuffer, 'test.txt');
      
      // Should reject due to MIME type validation
      assert.ok(response.status === 400 || response.status === 415);
    });

    it('should include image messages in message list', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Cookie', [`token=${tokenA}`]);
      
      assert.strictEqual(response.status, 200);
      const imageMessage = response.body.messages.find(m => m.id === imageMessageId);
      assert.ok(imageMessage);
      assert.strictEqual(imageMessage.type, 'image');
    });
  });

  describe('5. Unsending Messages', () => {
    it('should allow identity A to unsend their own message', async () => {
      const response = await request(app)
        .delete(`/api/messages/${messageIdFromA}`)
        .set('Cookie', [`token=${tokenA}`]);
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
    });

    it('should mark unsent message as deleted', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Cookie', [`token=${tokenA}`]);
      
      assert.strictEqual(response.status, 200);
      const deletedMessage = response.body.messages.find(m => m.id === messageIdFromA);
      assert.ok(deletedMessage);
      assert.strictEqual(deletedMessage.deleted, true);
    });

    it('should not allow identity A to unsend identity B\'s message', async () => {
      const response = await request(app)
        .delete(`/api/messages/${messageIdFromB}`)
        .set('Cookie', [`token=${tokenA}`]);
      
      assert.strictEqual(response.status, 403);
    });

    it('should preserve deleted messages in database', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Cookie', [`token=${tokenA}`]);
      
      assert.strictEqual(response.status, 200);
      const deletedMessage = response.body.messages.find(m => m.id === messageIdFromA);
      assert.ok(deletedMessage, 'Deleted message should still exist in database');
    });
  });

  describe('6. Adding Reactions', () => {
    let reactionMessageId;

    before(async () => {
      // Create a fresh message for reaction testing
      const response = await request(app)
        .post('/api/messages')
        .set('Cookie', [`token=${tokenA}`])
        .send({ text: 'Message for reactions' });
      
      reactionMessageId = response.body.message.id;
      testMessageIds.push(reactionMessageId); // Track for cleanup
    });

    it('should allow identity A to add a reaction to a message', async () => {
      const response = await request(app)
        .post(`/api/messages/${reactionMessageId}/reactions`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ emoji: '👍' });
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.reaction);
      assert.strictEqual(response.body.reaction.emoji, '👍');
      assert.strictEqual(response.body.reaction.user_role, 'A');
    });

    it('should allow identity B to add a different reaction to the same message', async () => {
      const response = await request(app)
        .post(`/api/messages/${reactionMessageId}/reactions`)
        .set('Cookie', [`token=${tokenB}`])
        .send({ emoji: '❤️' });
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.reaction);
      assert.strictEqual(response.body.reaction.emoji, '❤️');
      assert.strictEqual(response.body.reaction.user_role, 'B');
    });

    it('should display reactions with messages', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Cookie', [`token=${tokenA}`]);
      
      assert.strictEqual(response.status, 200);
      const messageWithReactions = response.body.messages.find(m => m.id === reactionMessageId);
      assert.ok(messageWithReactions);
      assert.ok(Array.isArray(messageWithReactions.reactions));
      assert.ok(messageWithReactions.reactions.length >= 2);
    });

    it('should toggle off reaction when adding same reaction again', async () => {
      const response = await request(app)
        .post(`/api/messages/${reactionMessageId}/reactions`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ emoji: '👍' });
      
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.reaction, null);
    });

    it('should allow multiple different reactions from same user', async () => {
      // Add first reaction
      await request(app)
        .post(`/api/messages/${reactionMessageId}/reactions`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ emoji: '😊' });

      // Add second reaction
      const response = await request(app)
        .post(`/api/messages/${reactionMessageId}/reactions`)
        .set('Cookie', [`token=${tokenA}`])
        .send({ emoji: '🎉' });
      
      assert.strictEqual(response.status, 200);
      assert.ok(response.body.reaction);
    });

    it('should preserve reactions when message is deleted', async () => {
      // Delete the message
      await request(app)
        .delete(`/api/messages/${reactionMessageId}`)
        .set('Cookie', [`token=${tokenA}`]);

      // Check that reactions are still present
      const response = await request(app)
        .get('/api/messages')
        .set('Cookie', [`token=${tokenA}`]);
      
      const deletedMessage = response.body.messages.find(m => m.id === reactionMessageId);
      assert.ok(deletedMessage);
      assert.strictEqual(deletedMessage.deleted, true);
      assert.ok(Array.isArray(deletedMessage.reactions));
      assert.ok(deletedMessage.reactions.length > 0);
    });
  });

  describe('7. Auto-lock Behavior', () => {
    it('should require authentication for all protected routes', async () => {
      const routes = [
        { method: 'get', path: '/api/messages' },
        { method: 'post', path: '/api/messages' },
        { method: 'get', path: '/api/auth/me' }
      ];

      for (const route of routes) {
        const response = await request(app)[route.method](route.path);
        assert.strictEqual(response.status, 401, `${route.method.toUpperCase()} ${route.path} should require auth`);
      }
    });

    it('should reject expired or invalid tokens', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', ['token=invalid-token']);
      
      assert.strictEqual(response.status, 401);
    });
  });

  describe('8. Complete Flow Integration', () => {
    it('should support complete conversation flow between A and B', async () => {
      // A sends a message
      const msgA = await request(app)
        .post('/api/messages')
        .set('Cookie', [`token=${tokenA}`])
        .send({ text: 'Integration test from A' });
      
      assert.strictEqual(msgA.status, 201);
      const messageAId = msgA.body.message.id;
      testMessageIds.push(messageAId); // Track for cleanup

      // B reads messages
      const readB = await request(app)
        .get('/api/messages')
        .set('Cookie', [`token=${tokenB}`]);
      
      assert.strictEqual(readB.status, 200);
      const foundMessage = readB.body.messages.find(m => m.id === messageAId);
      assert.ok(foundMessage);

      // B reacts to A's message
      const reactB = await request(app)
        .post(`/api/messages/${messageAId}/reactions`)
        .set('Cookie', [`token=${tokenB}`])
        .send({ emoji: '✅' });
      
      assert.strictEqual(reactB.status, 200);

      // B sends a reply
      const msgB = await request(app)
        .post('/api/messages')
        .set('Cookie', [`token=${tokenB}`])
        .send({ text: 'Reply from B' });
      
      assert.strictEqual(msgB.status, 201);
      testMessageIds.push(msgB.body.message.id); // Track for cleanup

      // A reads updated messages
      const readA = await request(app)
        .get('/api/messages')
        .set('Cookie', [`token=${tokenA}`]);
      
      assert.strictEqual(readA.status, 200);
      assert.ok(readA.body.messages.length >= 2);
    });
  });
});
