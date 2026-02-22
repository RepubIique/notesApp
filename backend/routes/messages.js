import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getMessages, createTextMessage, unsendMessage, markMessagesAsDelivered, markMessagesAsRead, updateUserActivity, getOtherUserActivity } from '../services/messages.js';
import { addReaction } from '../services/reactions.js';

const router = express.Router();

// GET /api/messages - Retrieve messages with pagination
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Parse query parameters
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const before = req.query.before || undefined;

    // Validate limit
    if (isNaN(limit) || limit <= 0) {
      return res.status(400).json({ error: 'Invalid limit parameter' });
    }

    // Call getMessages function
    const messages = await getMessages(limit, before);

    // Mark messages as delivered for the requesting user
    await markMessagesAsDelivered(req.user.role);

    // Update user's last seen
    await updateUserActivity(req.user.role, false);

    // Return messages array
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages - Create a new text message
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    // Validate text is non-empty
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Message text cannot be empty' });
    }

    // Get sender from req.user
    const sender = req.user.role;

    // Call createTextMessage function
    const message = await createTextMessage(sender, text);

    // Return created message
    res.status(201).json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// DELETE /api/messages/:messageId - Unsend a message
router.delete('/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Get requesting role from req.user
    const requestingRole = req.user.role;

    // Call unsendMessage function
    await unsendMessage(messageId, requestingRole);

    // Return success response
    res.json({ success: true });
  } catch (error) {
    console.error('Error unsending message:', error);

    // Handle 403 and 404 errors
    if (error.statusCode === 403) {
      return res.status(403).json({ error: error.message });
    }
    
    if (error.message === 'Message not found') {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.status(500).json({ error: 'Failed to unsend message' });
  }
});

// POST /api/messages/:messageId/reactions - Add or toggle a reaction
router.post('/:messageId/reactions', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    // Validate emoji is a single emoji character
    // Use emoji-regex to validate it's a valid emoji
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u;
    if (!emoji || !emojiRegex.test(emoji)) {
      return res.status(400).json({ error: 'Invalid emoji' });
    }

    // Get user role from req.user
    const userRole = req.user.role;

    // Call addReaction function
    const reaction = await addReaction(messageId, userRole, emoji);

    // Return reaction or null if toggled off
    res.json({ reaction });
  } catch (error) {
    console.error('Error adding reaction:', error);

    if (error.message === 'Message not found') {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// POST /api/messages/read - Mark messages as read
router.post('/read', authMiddleware, async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'messageIds must be an array' });
    }

    await markMessagesAsRead(req.user.role, messageIds);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// POST /api/messages/typing - Update typing status
router.post('/typing', authMiddleware, async (req, res) => {
  try {
    const { isTyping } = req.body;

    if (typeof isTyping !== 'boolean') {
      return res.status(400).json({ error: 'isTyping must be a boolean' });
    }

    await updateUserActivity(req.user.role, isTyping);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating typing status:', error);
    res.status(500).json({ error: 'Failed to update typing status' });
  }
});

// GET /api/messages/activity - Get other user's activity status
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const activity = await getOtherUserActivity(req.user.role);

    res.json({ activity });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

export default router;
