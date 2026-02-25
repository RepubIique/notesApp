import express from 'express';
import rateLimit from 'express-rate-limit';
import { checkUnreadMessagesForRecipient } from '../services/notifications.js';

const router = express.Router();

// Rate limiter for notification endpoint
// Allows 120 requests per minute per IP (supports 30-second polling with buffer)
const notificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// GET /api/notifications/unread-status/:recipient - Check if unread messages exist for specific recipient
// Public endpoint (no authentication required)
// :recipient should be 'A' or 'B'
router.get('/unread-status/:recipient', notificationLimiter, async (req, res) => {
  try {
    const { recipient } = req.params;
    
    // Validate recipient
    if (recipient !== 'A' && recipient !== 'B') {
      return res.status(400).json({ error: 'Invalid recipient: must be A or B' });
    }
    
    const hasUnread = await checkUnreadMessagesForRecipient(recipient);
    res.json({ hasUnread });
  } catch (error) {
    console.error(`Error checking unread status for ${req.params.recipient}:`, error);
    res.status(500).json({ error: 'Failed to check unread status' });
  }
});

export default router;
