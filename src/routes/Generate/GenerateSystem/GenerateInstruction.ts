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
      .select('char_uuid')
      .eq('chat_uuid', ChatId)
      .single();

    if (chatError) {
      console.error(`Error fetching chat (ChatId: ${ChatId}):`, chatError.message);
      return { error: chatError.code === 'PGRST116' ? 'Chat not found' : 'Failed to fetch chat details' };
    }

    if (!chatRecord?.char_uuid) return { error: 'No character assigned to this chat' };

    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select('persona, name, first_message, model_instructions')
      .eq('char_uuid', chatRecord.char_uuid)
      .single();

    if (characterError) {
      console.error(`Error fetching character (Character ID: ${chatRecord.char_uuid}):`, characterError.message);
      return { error: 'Failed to fetch character details' };
    }

    if (!character) return { error: 'Character not found' };

    const { persona, name, first_message, model_instructions } = character;

    if (!persona || !name || !first_message || !model_instructions) {
      return { error: 'Character data is incomplete' };
    }

    const Instruction = `### Instruction:
You are **${name}** always act as ${name} and speak as ${name}, a character with the following persona:
_${persona}_

#### Scenario:
*"${first_message}"*

#### Guidelines:
${model_instructions}

- Keep the story in a roleplaying way
- Strictly follow the given scenario and persona, maintaining consistency in behavior and dialogue.
- Avoid unnecessary repetition, generic statements, or breaking character.
- Use **bold formatting** for actions, descriptions, and emphasis, while using *quotation marks ("")* for spoken dialogue.
- Always replace user with {{user}}, and replace you with {{you}}.
    `;

    return { Instruction };
  } catch (error) {
    console.error(`Unexpected error in generateInstruction (ChatId: ${ChatId}):`, error);
    return { error: 'Internal server error' };
  }
}
