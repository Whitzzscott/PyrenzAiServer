import { Request, Response } from 'express';
import { vectorizeMessage } from './GenerateSystem/vectorizemessage.js';
import { saveMessageToSupabase } from './GenerateSystem/saveToSupabase.js';
import { generateInstruction } from './GenerateSystem/GenerateInstruction.js';
import { retrieveMessages } from './GenerateSystem/retrieveMessage.js';
import axios from 'axios';
import { z } from 'zod';
import llamaTokenizer from 'llama-tokenizer-js';
import { OPENROUTER_API_KEY } from '../../routes/utility.js';
import Bottleneck from 'bottleneck';
import { supabase } from '../Supabase.js';
import jwt from 'jsonwebtoken';

interface AdTokenPayload {
  created_at: string;
}

if (!OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY in environment variables.');

const requestSchema = z.object({
  Type: z.literal('Generate'),
  ConversationId: z.string().uuid(),
  Message: z.object({ User: z.string().min(1) }),
  inference_settings: z.object({
    model_id: z.string().uuid(),
    top_p: z.number().optional(),
    max_tokens: z.number().optional(),
    temperature: z.number().optional(),
    presence_penalty: z.number().optional(),
    frequency_penalty: z.number().optional(),
  }),
  ad_token: z.string().optional(),
  user_uuid: z.string().uuid(),
});

const limiter = new Bottleneck({
  maxConcurrent: 30,
  minTime: 200
});

async function callOpenRouterAPI(data: any) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const headers = { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' };
  return await axios.post(url, data, { headers, timeout: 15000 });
}

const cleanMemory = (message: string): string =>
  message.replace(/^### Memory \(User Response\):\s*/i, '').replace(/^### Memory \(AI Response\):\s*/i, '').trim();

async function fetchModelName(identifierUUID: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('model_identifiers')
    .select('model_name')
    .eq('identifier', identifierUUID)
    .single();

  if (error) {
    console.error('Error fetching model name:', error);
    return null;
  }

  return data.model_name;
}

export default async function Generate(req: Request, res: Response) {
  try {
    const { ConversationId, Message, inference_settings, ad_token, user_uuid } = requestSchema.parse(req.body);
    const rawUserMessage = Message.User;

    const { model_id, ...otherSettings } = inference_settings;

    const modelName = await fetchModelName(model_id);
    if (!modelName) {
      return res.status(400).json({ error: 'Invalid model identifier' });
    }

    if (ad_token) {
      const { data: userData, error: fetchError } = await supabase
        .from('user_data')
        .select('ad_token')
        .eq('user_uuid', user_uuid)
        .single();

      if (fetchError) {
        console.error('Error fetching user data:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch user data' });
      }

      if (!userData.ad_token) {
        return res.status(403).json({ error: 'Invalid ad_token' });
      }

      try {
        const decoded = jwt.verify(userData.ad_token, 'your_jwt_secret') as AdTokenPayload;
        const { created_at } = decoded;

        if (Date.now() - new Date(created_at).getTime() > 15000) {
          return res.status(403).json({ error: 'ad_token expired' });
        }
      } catch (error) {
        return res.status(403).json({ error: 'Invalid ad_token' });
      }

      const { error: updateError } = await supabase
        .from('user_data')
        .update({ ad_token: null })
        .eq('user_uuid', user_uuid);

      if (updateError) {
        console.error('Error updating ad_token:', updateError);
        return res.status(500).json({ error: 'Failed to update ad_token' });
      }
    }

    const { data: userData, error: fetchError } = await supabase
      .from('user_data')
      .select('message_count')
      .eq('user_uuid', user_uuid)
      .single();

    if (fetchError) {
      console.error('Error fetching user data:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch user data' });
    }

    let remainingMessages = userData.message_count;

    if (remainingMessages <= 0 && !ad_token) {
      return res.status(403).json({ error: 'Message limit reached. Please provide a valid ad_token to continue.' });
    }

    remainingMessages--;

    const { error: updateError } = await supabase
      .from('user_data')
      .update({ message_count: remainingMessages })
      .eq('user_uuid', user_uuid);

    if (updateError) {
      console.error('Error updating message count:', updateError);
      return res.status(500).json({ error: 'Failed to update message count' });
    }

    const createdAt = new Date();
    const tokenCount = llamaTokenizer.encode(rawUserMessage).length;

    const { error, Instruction } = await generateInstruction(ConversationId);
    if (error || !Instruction) return res.status(400).json({ error: error || 'Failed to fetch instruction' });

    const searchTerms = rawUserMessage.split(/\s+/).filter((word) => word.trim());
    let memoryArray = await retrieveMessages(ConversationId, searchTerms);
    let memory = memoryArray.map(cleanMemory).filter(Boolean).join('\n\n');

    const messageHistory = [
      { role: 'system', content: Instruction },
      ...(memory ? [{ role: 'assistant', content: memory }] : []),
      { role: 'user', content: `### Instruction:\n${rawUserMessage}\n\n### Response:` },
    ];

    const finalSettings = { ...otherSettings };

    const response = await limiter.schedule(() => callOpenRouterAPI({
      model: modelName,
      messages: messageHistory,
      ...finalSettings,
    }));

    const charMessage = response?.data?.choices?.[0]?.message?.content;
    if (!charMessage) return res.status(500).json({ error: 'Failed to retrieve character response' });

    const [userVector, aiVector] = await Promise.all([
      vectorizeMessage(rawUserMessage),
      vectorizeMessage(charMessage),
    ]);

    if (userVector.length !== 1536 || aiVector.length !== 1536) {
      return res.status(500).json({ error: 'Vector size mismatch. Ensure both vectors are 1536.' });
    }

    await saveMessageToSupabase(
      ConversationId,
      rawUserMessage,
      charMessage,
      ConversationId,
      createdAt,
      userVector,
      aiVector,
    );

    res.json({
      data: { role: 'character', content: charMessage },
      Engine: modelName,
      token: tokenCount,
      remainingMessages,
    });
  } catch (error: unknown) {
    console.error('Error generating reply:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else if (axios.isAxiosError(error)) {
      res.status(500).json({ error: error.response?.data || error.message });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred.' });
    }
  }
}
