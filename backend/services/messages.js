import { supabase } from '../config/supabase.js';

// Create a text message
export const createTextMessage = async (sender, text) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender,
      type: 'text',
      text,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create text message: ${error.message}`);
  }

  return data;
};

export const getMessages = async (limit = 50, before, userRole = null) => {
  let query = supabase
    .from('messages')
    .select(`
      *,
      reactions (
        id,
        message_id,
        user_role,
        emoji,
        created_at
      ),
      translations (
        id,
        message_id,
        source_language,
        target_language,
        translated_text,
        created_at
      )
    `)
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
