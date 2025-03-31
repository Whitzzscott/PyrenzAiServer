import { Request, Response } from 'express';
import { supabase } from '../Util.js'

export default async function GetCharacter(req: Request, res: Response): Promise<Response> {
  try {
    const { name, id } = req.query;

    if (!id && !name) {
      return res.status(400).json({ error: 'Either "id" or "name" must be provided.' });
    }

    let query = supabase
      .from('public_character_view') // ✅ Use the view instead
      .select('id, name, description, first_message, image_url');

    if (id) {
      query = query.eq('id', id);
    } else if (name) {
      query = query.eq('name', name);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('Database Error:', error);
      return res.status(500).json({ error: 'Failed to fetch character from the database.' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Character not found.' });
    }

    const character = {
      ...data,
      firstMessage: data.first_message,
      imageUrl: data.image_url, // ✅ Ensure image_url is returned correctly
    };

    return res.status(200).json(character);
  } catch (err) {
    console.error('Character Fetch Error:', (err as Error).message);
    return res.status(500).json({ error: (err as Error).message || 'An unexpected error occurred.' });
  }
}
