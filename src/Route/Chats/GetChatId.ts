import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../Utils.js';
import { z } from 'zod';

const requestSchema = z.object({
  type: z.enum(['getchatid', 'createchat']),
  chatID: z.string().uuid().optional(),
  characterID: z.number().int().positive().optional()
});

export default async function GetChatId(req: Request, res: Response): Promise<Response> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const parsedBody = requestSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({ error: 'Invalid request payload', details: parsedBody.error.errors });
    }

    const { type, chatID, characterID } = parsedBody.data;

    // Skip the auth header logic since it's not needed

    if (type === 'getchatid') {
      if (!chatID) {
        return res.status(400).json({ error: 'chatID is required for type "getchatid"' });
      }

      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('character_id, user_uuid')
        .eq('chat_id', chatID)
        .single();

      if (chatError) {
        return res.status(500).json({ error: 'Access Denied' });
      }

      if (!chatData) {
        return res.status(404).json({ error: 'Chat Does Not Exist' });
      }

      const { character_id } = chatData;

      const { data: characterData, error: characterError } = await supabase
        .from('public_character_view')
        .select('id, name, image_url, first_message')
        .eq('id', character_id)
        .single();

      if (characterError) {
        return res.status(500).json({ error: 'Access Denied' });
      }

      if (!characterData) {
        return res.status(404).json({ error: 'Character not found' });
      }

      return res.status(200).json({ character: characterData });
    }

    if (type === 'createchat') {
      if (!characterID) {
        return res.status(400).json({ error: 'characterID is required for type "createchat"' });
      }

      const newChatID = uuidv4();

      const { error } = await supabase.from('chats').insert([{ chat_id: newChatID, character_id: characterID }]);

      if (error) {
        return res.status(500).json({ error: 'Access Denied' });
      }

      return res.status(200).json({ chatID: newChatID });
    }

    if (characterID && chatID) {
      const { data: characterData, error: characterError } = await supabase
        .from('public_character_view')
        .select('id, name, image_url, first_message')
        .eq('id', characterID)
        .single();

      if (characterError) {
        return res.status(500).json({ error: 'Access Denied' });
      }

      if (!characterData) {
        return res.status(404).json({ error: 'Character not found' });
      }

      return res.status(200).json({ character: characterData });
    }

    return res.status(400).json({ error: 'Invalid type' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error', details: (err as Error).message });
  }
}
