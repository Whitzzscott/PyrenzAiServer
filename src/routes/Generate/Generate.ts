import { Request, Response } from 'express';
import { vectorizeMessage } from './GenerateSystem/vectorizemessage.js';
import { saveMessageToSupabase } from './GenerateSystem/saveToSupabase.js';
import { generateInstruction } from './GenerateSystem/GenerateInstruction.js';
import { retrieveMessages } from './GenerateSystem/retrieveMessage.js';
import axios from 'axios';
import { z } from 'zod';
import llamaTokenizer from 'llama-tokenizer-js';
import { v4 as uuidv4 } from 'uuid';
import { savePreviousMessage } from './GenerateSystem/savePreviousMessage.js';
import { OPENROUTER_API_KEY } from '~/utils/Uility'

if (!OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY in environment variables.');

const modelMap = { 'Mango Ube': 'sao10k/l3-lunaris-8b' } as const;

const requestSchema = z.object({
  Type: z.literal('Generate'),
  ConversationId: z.string().uuid(),
  Message: z.object({ User: z.string().min(1) }),
  Engine: z.enum(Object.keys(modelMap) as [keyof typeof modelMap]).default('Mango Ube'),
  characterImageUrl: z.string().url(),
  inference_settings: z.record(z.any()).optional(),
});

async function callOpenRouterAPI(data: any) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const headers = { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' };
  return await axios.post(url, data, { headers, timeout: 15000 });
}

const cleanMemory = (message: string): string =>
  message.replace(/^### Memory \(User Response\):\s*/i, '').replace(/^### Memory \(AI Response\):\s*/i, '').trim();

export default async function generate(req: Request, res: Response) {
  try {
    const { ConversationId, Message, Engine, characterImageUrl, inference_settings = {} } = requestSchema.parse(req.body);
    const rawUserMessage = Message.User;
    const model = modelMap[Engine];

    const createdAt = new Date();
    const tokenCount = llamaTokenizer.encode(rawUserMessage).length;
    const userMessageUuid = uuidv4();
    const charMessageUuid = uuidv4();

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

    const response = await callOpenRouterAPI({
      model,
      messages: messageHistory,
      ...inference_settings,
      max_tokens: 500,
      temperature: 1.4,
      top_p: 0.1,
    });

    const aiMessage = response?.data?.choices?.[0]?.message?.content;
    if (!aiMessage) return res.status(500).json({ error: 'Failed to retrieve AI response' });

    const [userVector, aiVector] = await Promise.all([
      vectorizeMessage(rawUserMessage),
      vectorizeMessage(aiMessage),
    ]);

    if (userVector.length !== 1536 || aiVector.length !== 1536) {
      return res.status(500).json({ error: 'Vector size mismatch. Ensure both vectors are 1536.' });
    }

    await saveMessageToSupabase(
      ConversationId,
      rawUserMessage,
      aiMessage,
      ConversationId,
      createdAt,
      userVector,
      aiVector,
      userMessageUuid,
      charMessageUuid
    );

    await savePreviousMessage(req, ConversationId, aiMessage, characterImageUrl);

    res.json({
      data: { role: 'character', content: aiMessage },
      Engine,
      token: tokenCount,
      id: [{ userMessageUuid, charMessageUuid }],
    });
  } catch (error: unknown) {
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
