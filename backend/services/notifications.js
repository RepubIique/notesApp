import { supabase } from '../config/supabase.js';
import { generateContentPreview, getSenderDisplayName } from '../utils/messageUtils.js';

/**
 * Check if unread messages exist for a specific identity
 * Returns a boolean indicating whether unread messages exist for the given recipient
 * 
 * @param {string} recipient - The recipient identity ('A' or 'B')
 * @returns {Promise<boolean>} True if unread messages exist for this recipient, false otherwise
 * @throws {Error} If the database query fails
 */
export const checkUnreadMessagesForRecipient = async (recipient) => {
  // Validate recipient
  if (recipient !== 'A' && recipient !== 'B') {
    throw new Error('Invalid recipient: must be A or B');
  }

  // Messages are unread for a recipient if:
  // - sender is NOT the recipient (they didn't send it)
  // - read_at is null (not read yet)
  // - deleted is false (not deleted)
  const otherIdentity = recipient === 'A' ? 'B' : 'A';

  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('sender', otherIdentity) // Messages FROM the other person
    .is('read_at', null) // Not read yet
    .eq('deleted', false) // Not deleted
    .limit(1);

  if (error) {
    throw new Error(`Failed to check unread messages for ${recipient}: ${error.message}`);
  }

  // Return true if any unread messages exist
  return !!(data && data.length > 0);
};

/**
 * Format a notification body for a message, including reply context if applicable.
 * 
 * @param {Object} message - The message object
 * @param {string} message.sender - The sender identifier ('A' or 'B')
 * @param {string|null} message.reply_to_id - The ID of the message being replied to (if any)
 * @param {Object|null} message.reply_to_message - The original message data (if reply)
 * @returns {Promise<string>} The formatted notification body
 */
export const formatNotificationBody = async (message) => {
  const senderName = getSenderDisplayName(message.sender);
  
  // If this is a reply message, include reply context
  if (message.reply_to_id && message.reply_to_message) {
    const originalMessage = message.reply_to_message;
    // generateContentPreview already handles truncation at maxLength
    const preview = generateContentPreview(originalMessage, 50);
    
    return `${senderName} replied to: ${preview}`;
  }
  
  // If this is not a reply, format as standard notification
  // generateContentPreview already handles truncation at maxLength
  const preview = generateContentPreview(message, 50);
  
  return `${senderName}: ${preview}`;
};

/**
 * Create a notification payload for a message.
 * This function prepares the notification data that would be sent via push notification service.
 * 
 * @param {Object} message - The message object with reply_to_message populated if applicable
 * @param {string} recipient - The recipient identity ('A' or 'B')
 * @returns {Promise<Object>} The notification payload
 */
export const createNotificationPayload = async (message, recipient) => {
  const body = await formatNotificationBody(message);
  
  return {
    title: 'New Message',
    body,
    data: {
      messageId: message.id,
      sender: message.sender,
      recipient,
      isReply: !!message.reply_to_id,
      replyToId: message.reply_to_id || null
    }
  };
};
