import { supabase } from '../../Supabase.js';

export async function saveMessageToSupabase(
  conversationId: string,
  userMessage: string,
  charMessage: string,
  user_uuid: string,
  createdAt: Date,
  userVector: number[],
  aiVector: number[]
) {
  try {
    const { error: insertError } = await supabase.from('chat_messages').insert([
      {
        conversation_id: conversationId,
        user_message: userMessage,
        char_message: charMessage,
        user_uuid: user_uuid,
        created_at: createdAt,
        user_vector: userVector,
        ai_vector: aiVector,
      },
    ]);

    if (insertError) {
      throw new Error(`Failed to store message in Supabase: ${insertError.message}`);
    }

    const { data: chatData, error: fetchError } = await supabase
      .from('chats')
      .select('char_uuid')
      .eq('conversation_id', conversationId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch chat data: ${fetchError.message}`);
    }

    if (!chatData) {
      throw new Error('No chat data found for the given conversation_id');
    }

    const { char_uuid } = chatData;

    const { error: updateError } = await supabase.rpc('increment_chat_messages_count', {
      char_uuid_param: char_uuid,
    });

    if (updateError) {
      throw new Error(`Failed to update chat_messages_count: ${updateError.message}`);
    }

  } catch (error: any) {
    throw new Error(`Unexpected error: ${error.message}`);
  }
}
