import { supabase } from '../../Supabase.js';

export async function saveMessageToSupabase(
  conversationId: string,
  userMessage: string,
  charMessage: string,
  userId: string,
  createdAt: Date,
  userVector: number[],
  aiVector: number[]
) {
  try {
    const { error } = await supabase.from('chat_messages').insert([
      {
        conversation_id: conversationId,
        user_message: userMessage,
        char_message: charMessage,
        user_uuid: userId,
        created_at: createdAt,
        user_vector: userVector,
        ai_vector: aiVector,
      },
    ]);

    if (error) {
      throw new Error(`Failed to store message in Supabase: ${error.message}`);
    }
  } catch (error: any) {
    throw new Error(`Unexpected error storing message: ${error.message}`);
  }
}
