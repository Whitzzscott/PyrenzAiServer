import { supabase } from '../../Supabase.js';
import { z } from 'zod';

const retrieveMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  searchTerms: z.array(z.string()).optional(),
  pageSize: z.number().int().min(1).max(100).default(25),
  ftsWeight: z.number().min(0).max(1).optional().default(0.5),
  minScore: z.number().min(0).optional().default(0.0),
});

const sanitizeSearchTerms = (terms: string[]): string[] =>
  terms
    .map((term) => term.replace(/[^\w\s]/gi, '').trim())
    .filter((term) => term.length > 0);

const fetchFilteredMessages = async (
  conversationId: string,
  searchTerms: string[] = [],
  pageSize: number = 15,
  ftsWeight: number = 0.5,
  minScore: number = 0.0
): Promise<string[]> => {
  try {
    console.log('🔍 Search Terms:', searchTerms.length ? searchTerms : 'No search terms provided');

    const { data, error } = await supabase.rpc('get_filtered_messages', {
      p_conversation_id: conversationId,
      p_search_terms: searchTerms,
      p_limit_val: pageSize,
      p_fts_weight: ftsWeight,
      p_min_score: minScore,
    });

    if (error) throw new Error(`Message retrieval failed: ${error.message}`);

    if (!Array.isArray(data)) {
      throw new Error('Unexpected data format returned from RPC call');
    }

    const memoryLogs = data.map((msg: any) => {
      const userMemory = msg.user_message ? `{{user}}: ${msg.user_message}` : '';
      const aiMemory = msg.char_message ? `{{you}}: ${msg.char_message}` : '';
      return [userMemory, aiMemory].filter(Boolean).join('');
    });

    console.log('🧠 Retrieved Memory:', memoryLogs.length ? memoryLogs : ['No relevant memory found.']);

    return memoryLogs.length > 0 ? memoryLogs : [];
  } catch (error) {
    console.error('❗ Error fetching filtered messages:', error);
    throw error;
  }
};

export const retrieveMessages = async (
  conversationId: string,
  searchTerms: string[] = [],
  pageSize: number = 25,
  ftsWeight: number = 0.5,
  minScore: number = 0.0
): Promise<string[]> => {
  const { conversationId: validatedId, searchTerms: terms, pageSize: size, ftsWeight: weight, minScore: score } =
    retrieveMessagesSchema.parse({ conversationId, searchTerms, pageSize, ftsWeight, minScore });

  const cleanSearchTerms = terms ? sanitizeSearchTerms(terms) : [];

  console.log('🔎 Cleaned Search Terms:', cleanSearchTerms);

  return fetchFilteredMessages(validatedId, cleanSearchTerms, size, weight, score);
};
