import { supabase } from '../config/supabase.js';

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
