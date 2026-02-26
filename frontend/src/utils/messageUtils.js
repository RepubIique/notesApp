/**
 * Generate a content preview for a message based on its type and content.
 * Used for reply indicators and reply previews.
 * 
 * @param {Object} message - The message object
 * @param {string} message.type - Message type ('text', 'image', 'voice')
 * @param {string|null} message.text - Message text content (for text messages)
 * @param {number|null} message.audio_duration - Audio duration in seconds (for voice messages)
 * @param {boolean} message.deleted - Whether the message is deleted
 * @param {number} maxLength - Maximum length for text preview (default: 100)
 * @returns {string} The content preview string
 */
export function generateContentPreview(message, maxLength = 100) {
  if (message.deleted) {
    return '[Message deleted]';
  }
  
  switch (message.type) {
    case 'text':
      if (!message.text) {
        return '[Message]';
      }
      return message.text.length > maxLength
        ? message.text.substring(0, maxLength) + '...'
        : message.text;
    
    case 'image':
      return '[Image]';
    
    case 'voice':
      const duration = message.audio_duration || 0;
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `[Voice message ${minutes}:${seconds.toString().padStart(2, '0')}]`;
    
    default:
      return '[Message]';
  }
}

/**
 * Get the display name for a message sender.
 * 
 * @param {string} sender - The sender identifier ('A' or 'B')
 * @param {string} currentUserRole - The current user's role ('A' or 'B')
 * @returns {string} Display name ('You' or 'Them')
 */
export function getSenderDisplayName(sender, currentUserRole) {
  return sender === currentUserRole ? 'You' : 'Them';
}
