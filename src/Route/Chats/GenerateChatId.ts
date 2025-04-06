import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../Utils.js';
import { z } from 'zod';

const chatSchema = z.object({
  characterID: z.string().refine((val) => !isNaN(Number(val)), {
    message: 'characterID must be a valid number'
  }).transform(Number)
});

export default async function GenerateChatID(req: Request, res: Response): Promise<Response> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const parsedBody = chatSchema.safeParse(req.body);

    if (!parsedBody.success) {
      return res.status(400).json({ error: 'Invalid request payload', details: parsedBody.error.errors });
    }

    const { characterID } = parsedBody.data;
    const chatID = uuidv4();

    const { error } = await supabase
      .from('chats')
      .insert([{ chat_id: chatID, character_id: characterID }]);

    if (error) {
      console.error('Database Insert Error:', error);
      return res.status(500).json({ error: 'Access Denied' });
    }

    return res.status(200).json({ chatID });
  } catch (err) {
    console.error('Internal Server Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: (err as Error).message });
  }
}
