import { supabase } from '../Utils.js';
import { Request, Response } from 'express';

interface PreviousChatRequest {
  page: number;
  order: 'asc' | 'desc';
  limit: number;
  Type: 'GetPreviousChat' | 'GetPreviousChatById';
  conversationId?: string;
}

export async function PreviousChat(req: Request, res: Response) {
  try {
    const { page, order, limit, Type, conversationId } = req.body as PreviousChatRequest;

    if (Type === 'GetPreviousChat') {
      if (!conversationId) {
        throw new Error('Conversation ID missing');
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from('previous_message')
        .select('*, conversation_id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: order === 'asc' })
        .range(from, to);

      if (error) {
        console.error('Error fetching previous chat messages:', error);
        throw new Error('Failed to fetch previous chat messages');
      }

      res.json(data);
    } else if (Type === 'GetPreviousChatById') {
      const { data, error } = await supabase
        .from('previous_message')
        .select('*, conversation_id')
        .order('created_at', { ascending: order === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        console.error('Error fetching previous chat messages by user ID:', error);
        throw new Error('Failed to fetch previous chat messages by user ID');
      }

      res.json(data);
    } else {
      throw new Error('Invalid request type');
    }
  } catch (error) {
    console.error('Error in PreviousChat:', error);
    res.status(500).json({ error: 'Failed to fetch previous chat messages' });
  }
}
