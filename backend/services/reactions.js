import { supabase } from '../config/supabase.js';

// Add or toggle a reaction
export const addReaction = async (messageId, userRole, emoji) => {
  // Check if reaction already exists for this user/message/emoji combination
  const { data: existingReaction, error: fetchError } = await supabase
    .from('reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_role', userRole)
    .eq('emoji', emoji)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to check existing reaction: ${fetchError.message}`);
  }

  // If reaction exists, delete it (toggle off)
  if (existingReaction) {
    const { error: deleteError } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existingReaction.id);

    if (deleteError) {
      throw new Error(`Failed to delete reaction: ${deleteError.message}`);
    }

    return null; // Toggled off
  }

  // If reaction doesn't exist, create it (toggle on)
  const { data: newReaction, error: insertError } = await supabase
    .from('reactions')
    .insert({
      message_id: messageId,
      user_role: userRole,
      emoji,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create reaction: ${insertError.message}`);
  }

  return newReaction;
};

export const getReactionsForMessage = async (messageId) => {
  const { data, error } = await supabase
    .from('reactions')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch reactions: ${error.message}`);
  }

  return data || [];
};
