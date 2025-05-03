import axios from 'axios';
import { OPENAI_API_KEY } from '../../../routes/utility.js'

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_EMBEDDING_MODEL =   'text-embedding-ada-002';
 
if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY in environment variables.');

export const vectorizeMessage = async (message: string): Promise<number[]> => {
  if (!message.trim()) throw new Error('Message cannot be empty or whitespace.');

  try {
    const { data } = await axios.post(
      OPENAI_API_URL,
      { input: message, model: OPENAI_EMBEDDING_MODEL },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } }
    );

    const vector = data?.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.some((val) => typeof val !== 'number')) {
      throw new Error('Invalid embedding vector received from OpenAI API.');
    }

    return vector;
  } catch (error: any) {
    const errorMessage = error?.response?.data?.error?.message || error?.message || 'Unknown error';
    console.error('🚨 Error vectorizing message:', errorMessage);
    throw new Error(`Failed to vectorize message: ${errorMessage}`);
  }
};
