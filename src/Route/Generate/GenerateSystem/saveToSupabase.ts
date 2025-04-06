import { supabase } from '../../Utils.js';

export async function saveMessageToSupabase(
  conversationId: string,
  userMessage: string,
  aiMessage: string,
  userId: string,
  createdAt: Date,
  userVector: number[],
  aiVector: number[],
  userMessageUuid: string,
  charMessageUuid: string
) {
  try {
    const { error } = await supabase.from('messages').insert([
      {
        conversation_id: conversationId,
        user_message: userMessage,
        ai_message: aiMessage,
        user_uuid: userId,
        created_at: createdAt,
        user_vector: userVector,
        ai_vector: aiVector,
        user_message_uuid: userMessageUuid,
        char_message_uuid: charMessageUuid,
      },
    ]);

    if (error) {
      throw new Error(`Failed to store message in Supabase: ${error.message}`);
    }
  } catch (error: any) {
    throw new Error(`Unexpected error storing message: ${error.message}`);
  }
}
