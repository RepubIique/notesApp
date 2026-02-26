import { supabase } from '../config/supabase.js';

/**
 * Create a text message with optional reply reference.
 * 
 * @param {string} sender - The sender identifier ('A' or 'B')
 * @param {string} text - The message text content
 * @param {string|null} [replyToId=null] - Optional ID of the message being replied to
 * @returns {Promise<Object>} The created message object
 * @throws {Error} If message creation fails or reply reference is invalid
 */
export const createTextMessage = async (sender, text, replyToId = null) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender,
      type: 'text',
      text,
      reply_to_id: replyToId,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    // Check for foreign key constraint violation (invalid reply_to_id)
    if (error.code === '23503' || error.message.includes('foreign key')) {
      const fkError = new Error('Invalid reply reference');
      fkError.statusCode = 400;
      throw fkError;
    }
    throw new Error(`Failed to create text message: ${error.message}`);
  }

  return data;
};

/**
 * Get messages with reply data, reactions, and translations.
 * Fetches messages and enriches them with related data including reply_to_message objects.
 * 
 * @param {number} [limit=50] - Maximum number of messages to fetch
 * @param {string} [before] - Fetch messages before this timestamp (for pagination)
 * @param {string|null} [userRole=null] - Current user's role for translation preferences
 * @returns {Promise<Array>} Array of message objects with enriched data
 * @throws {Error} If message fetching fails
 */
export const getMessages = async (limit = 50, before, userRole = null) => {
  // Fetch messages with basic query
  let query = supabase
    .from('messages')
    .select('*')
    .eq('deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Apply before filter if provided
  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  // Fetch reply data for messages that have reply_to_id
  if (data && data.length > 0) {
    const messageIds = data.map(msg => msg.id);
    const replyToIds = data
      .filter(msg => msg.reply_to_id)
      .map(msg => msg.reply_to_id);

    // Fetch original messages for replies (if any)
    let replyMessages = [];
    if (replyToIds.length > 0) {
      const { data: replyData, error: replyError } = await supabase
        .from('messages')
        .select('id, sender, type, text, image_path, audio_path, audio_duration, deleted, created_at')
        .in('id', replyToIds);

      if (!replyError && replyData) {
        replyMessages = replyData;
      }
    }

    // Create a map of reply messages by id
    const replyMap = new Map(replyMessages.map(msg => [msg.id, msg]));

    // Attach reply_to_message to each message
    data.forEach(message => {
      if (message.reply_to_id) {
        message.reply_to_message = replyMap.get(message.reply_to_id) || null;
      } else {
        message.reply_to_message = null;
      }
    });

    // Fetch reactions
    const { data: reactions, error: reactionsError } = await supabase
      .from('reactions')
      .select('*')
      .in('message_id', messageIds);

    if (!reactionsError && reactions) {
      // Group reactions by message_id
      const reactionsMap = new Map();
      reactions.forEach(reaction => {
        if (!reactionsMap.has(reaction.message_id)) {
          reactionsMap.set(reaction.message_id, []);
        }
        reactionsMap.get(reaction.message_id).push(reaction);
      });

      // Attach reactions to messages
      data.forEach(message => {
        message.reactions = reactionsMap.get(message.id) || [];
      });
    }

    // Fetch translations
    const { data: translations, error: translationsError } = await supabase
      .from('translations')
      .select('*')
      .in('message_id', messageIds);

    if (!translationsError && translations) {
      // Group translations by message_id
      const translationsMap = new Map();
      translations.forEach(translation => {
        if (!translationsMap.has(translation.message_id)) {
          translationsMap.set(translation.message_id, []);
        }
        translationsMap.get(translation.message_id).push(translation);
      });

      // Attach translations to messages
      data.forEach(message => {
        message.translations = translationsMap.get(message.id) || [];
      });
    }
  }

  // If userRole is provided, fetch translation preferences for this user
  if (userRole && data && data.length > 0) {
    const messageIds = data.map(msg => msg.id);
    
    const { data: preferences, error: prefError } = await supabase
      .from('translation_preferences')
      .select('*')
      .eq('user_role', userRole)
      .in('message_id', messageIds);

    if (!prefError && preferences) {
      // Create a map of message_id to preference
      const prefMap = new Map(preferences.map(pref => [pref.message_id, pref]));
      
      // Attach preferences to messages
      data.forEach(message => {
        const pref = prefMap.get(message.id);
        if (pref) {
          message.translation_preference = {
            show_original: pref.show_original,
            target_language: pref.target_language
          };
        }
      });
    }
  }

  return data;
};

export const unsendMessage = async (messageId, requestingRole) => {
  // First, query the message to verify it exists and get the sender
  const { data: message, error: fetchError } = await supabase
    .from('messages')
    .select('id, sender')
    .eq('id', messageId)
    .single();

  if (fetchError || !message) {
    throw new Error('Message not found');
  }

  // Verify sender matches requesting role
  if (message.sender !== requestingRole) {
    const error = new Error('Cannot unsend another user\'s message');
    error.statusCode = 403;
    throw error;
  }

  // Update deleted=true
  const { error: updateError } = await supabase
    .from('messages')
    .update({ deleted: true })
    .eq('id', messageId);

  if (updateError) {
    throw new Error(`Failed to unsend message: ${updateError.message}`);
  }
};

// Mark messages as delivered when fetched by the other user
export const markMessagesAsDelivered = async (userRole) => {
  const { error } = await supabase
    .from('messages')
    .update({ delivered_at: new Date().toISOString() })
    .neq('sender', userRole) // Messages sent by the other user
    .is('delivered_at', null); // Only undelivered messages

  if (error) {
    console.error('Failed to mark messages as delivered:', error);
  }
};

// Mark messages as read
export const markMessagesAsRead = async (userRole, messageIds) => {
  if (!messageIds || messageIds.length === 0) return;

  const { error } = await supabase
    .from('messages')
    .update({ 
      read_at: new Date().toISOString(),
      read_by: userRole
    })
    .in('id', messageIds)
    .neq('sender', userRole) // Only mark other user's messages as read
    .is('read_at', null); // Only unread messages

  if (error) {
    console.error('Failed to mark messages as read:', error);
    throw new Error(`Failed to mark messages as read: ${error.message}`);
  }
};

// Update user activity (last seen and typing status)
export const updateUserActivity = async (userRole, isTyping = false) => {
  const { error } = await supabase
    .from('user_activity')
    .upsert({
      user_role: userRole,
      last_seen: new Date().toISOString(),
      is_typing: isTyping,
      typing_updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_role'
    });

  if (error) {
    console.error('Failed to update user activity:', error);
    throw new Error(`Failed to update user activity: ${error.message}`);
  }
};

// Get other user's activity status
export const getOtherUserActivity = async (currentUserRole) => {
  const otherRole = currentUserRole === 'A' ? 'B' : 'A';
  
  const { data, error } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_role', otherRole)
    .single();

  if (error) {
    console.error('Failed to get user activity:', error);
    return null;
  }

  // Check if typing status is stale (older than 5 seconds)
  const typingAge = Date.now() - new Date(data.typing_updated_at).getTime();
  if (typingAge > 5000) {
    data.is_typing = false;
  }

  return data;
};
