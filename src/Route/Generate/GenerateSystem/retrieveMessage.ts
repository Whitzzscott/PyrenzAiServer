import { supabase } from '../../Util.js';
import { z } from 'zod';
import { vectorizeMessage } from '../GenerateSystem/vectorizemessage.js';

interface MessageResult {
  conversation_id: string;
  user_message: string | null;
  ai_message: string | null;
  created_at: string;
  relevance_score: number;
}

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
  pageSize = 15,
  ftsWeight = 0.5,
  minScore = 0.0
): Promise<string[]> => {
  try {
    console.log('🔍 Search Terms:', searchTerms.length ? searchTerms : 'No search terms provided');

    const searchVector = searchTerms.length
      ? await vectorizeMessage(searchTerms.join(' '))
      : null;

    const { data, error } = (await supabase.rpc('get_filtered_messages', {
      convo_id: conversationId,
      search_terms: searchTerms,
      limit_val: pageSize,
      search_vector: searchVector,
      fts_weight: ftsWeight,
      min_score: minScore,
    })) as { data: MessageResult[] | null; error: any };

    if (error) throw new Error(`Message retrieval failed: ${error.message}`);

    const memoryLogs = (data ?? [])
      .map((msg) => {
        const userMemory = msg.user_message ? `### Memory (User Response):\n${msg.user_message}` : '';
        const aiMemory = msg.ai_message ? `### Memory (AI Response):\n${msg.ai_message}` : '';
        return [userMemory, aiMemory].filter(Boolean).join('\n\n');
      });

    console.log('🧠 Retrieved Memory:', memoryLogs.length ? memoryLogs : ['No relevant memory found.']);

    return memoryLogs;
  } catch (error) {
    console.error('❗ Error fetching filtered messages:', error);
    throw error;
  }
};

export const retrieveMessages = async (
  conversationId: string,
  searchTerms?: string[],
  pageSize = 25,
  ftsWeight = 0.5,
  minScore = 0.0
): Promise<string[]> => {
  const { conversationId: validatedId, searchTerms: terms, pageSize: size, ftsWeight: weight, minScore: score } =
    retrieveMessagesSchema.parse({ conversationId, searchTerms, pageSize, ftsWeight, minScore });

  const cleanSearchTerms = terms ? sanitizeSearchTerms(terms) : [];

  console.log('🔎 Cleaned Search Terms:', cleanSearchTerms);

  return fetchFilteredMessages(validatedId, cleanSearchTerms, size, weight, score);
};
