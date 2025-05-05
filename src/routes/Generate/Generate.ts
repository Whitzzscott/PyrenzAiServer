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

if (!OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY in environment variables.');

const modelMap = { 'Mango Ube': 'sao10k/l3-lunaris-8b' } as const;

const requestSchema = z.object({
  Type: z.literal('Generate'),
  ConversationId: z.string().uuid(),
  Message: z.object({ User: z.string().min(1) }),
  Engine: z.enum(Object.keys(modelMap) as [keyof typeof modelMap]).default('Mango Ube'),
  inference_settings: z.record(z.any()),
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

export default async function Generate(req: Request, res: Response) {
  try {
    const { ConversationId, Message, Engine, inference_settings = {} } = requestSchema.parse(req.body);
    const rawUserMessage = Message.User;
    const model = modelMap[Engine];

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

    const finalSettings = { ...inference_settings };

    const response = await limiter.schedule(() => callOpenRouterAPI({
      model,
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
      Engine,
      token: tokenCount,
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
