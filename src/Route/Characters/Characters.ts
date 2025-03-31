import { Request, Response } from 'express';
import { supabase } from '../Util.js';
import { z } from 'zod';

const bodySchema = z.object({
  type: z.string().min(1),
  page: z.string().default('1').transform(Number),
  maxCharacters: z
    .string()
    .default('10')
    .transform(Number)
    .refine((val) => val > 0 && val <= 99),
  search: z.string().optional(),
});

interface Character {
  id: number;
  name: string;
  description: string;
  first_message: string;
  image_url: string;
  tags: string | string[];
}

export default async function fetchCharacter(req: Request, res: Response): Promise<Response> {
  try {
    const { type, page, maxCharacters, search } = bodySchema.parse(req.body);

    if (type !== 'character') {
      return res.status(400).json({ error: 'Invalid type' });
    }

    let query = supabase.from('public_character_view').select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const offset = (page - 1) * maxCharacters;
    query = query.range(offset, offset + maxCharacters - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch character data',
        details: error.message || error,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No characters found.' });
    }

    const sanitizedData = data.map((char: Character) => ({
      ...char,
      tags: Array.isArray(char.tags)
        ? char.tags
        : typeof char.tags === 'string'
          ? char.tags.split(',').map((tag: string) => tag.trim())
          : [],
    }));

    return res.status(200).json({ characters: sanitizedData, total: count || data.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: error instanceof Error ? error.message : 'An unexpected error occurred.' });
  }
}
