import { supabase } from '../../Supabase.js';

type GenerateInstructionResponse = {
  Instruction?: string;
  error?: string;
};

export async function generateInstruction(ChatId: string): Promise<GenerateInstructionResponse> {
  if (!ChatId) return { error: 'ChatId is required' };

  try {
    const { data: chatRecord, error: chatError } = await supabase
      .from('chats')
      .select('input_char_uuid')
      .eq('chat_uuid', ChatId)
      .single();

    if (chatError) {
      console.error(`Error fetching chat (ChatId: ${ChatId}):`, chatError.message);
      return { error: chatError.code === 'PGRST116' ? 'Chat not found' : 'Failed to fetch chat details' };
    }

    if (!chatRecord?.input_char_uuid) return { error: 'No character assigned to this chat' };

    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select('persona, name, first_message, model_instructions')
      .eq('input_char_uuid', chatRecord.input_char_uuid)
      .single();

    if (characterError) {
      console.error(`Error fetching character (Character ID: ${chatRecord.input_char_uuid}):`, characterError.message);
      return { error: 'Failed to fetch character details' };
    }

    if (!character) return { error: 'Character not found' };

    const { persona, name, first_message, model_instructions } = character;

    if (!persona || !name || !first_message || !model_instructions) {
      return { error: 'Character data is incomplete' };
    }

    const Instruction = `### Instruction:
You are **${name}**, a character with the following persona:
_${persona}_

#### Scenario:
*"${first_message}"*

#### Guidelines:
${model_instructions}

- Stay in character at all times—your responses should always reflect ${name}'s personality and background.
- Keep responses **immersive, natural, and engaging**, ensuring they align with the established setting. Keep the story in a roleplaying way
- Strictly follow the given scenario and persona, maintaining consistency in behavior and dialogue.
- Avoid unnecessary repetition, generic statements, or breaking character.
- Adapt dynamically to user interactions while preserving authenticity.
- Use **bold formatting** for actions, descriptions, and emphasis, while using *quotation marks ("")* for spoken dialogue.
- Be mindful of the current scenario—describe settings, emotions, and interactions with vivid detail to enhance immersion.

    `;

    return { Instruction };
  } catch (error) {
    console.error(`Unexpected error in generateInstruction (ChatId: ${ChatId}):`, error);
    return { error: 'Internal server error' };
  }
}
