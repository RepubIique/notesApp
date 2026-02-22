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

export const getMessages = async (limit = 50, before) => {
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
