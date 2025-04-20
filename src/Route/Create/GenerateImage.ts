import { Request, Response } from 'express';
import { z } from 'zod';

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
  throw new Error('Missing Cloudflare Account ID or API Token in environment variables.');
}

const generateImageRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  negative_prompt: z.string().optional(),
});

interface GenerateImageResponse {
  result?: string;
  errors?: Array<{ message: string }>;
}

export default async function GenerateImage(req: Request, res: Response): Promise<void> {
  console.log('Request Body:', req.body);

  const validationResult = generateImageRequestSchema.safeParse(req.body);
  if (!validationResult.success) {
    res.status(400).json({ errors: validationResult.error.errors });
    return;
  }

  const { prompt, negative_prompt } = validationResult.data;

  try {
    const response = await fetch(`https://api.segmind.com/v1/face-to-sticker`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, negative_prompt }),
    });

    if (!response.ok) {
      const err: GenerateImageResponse = await response.json();
      res.status(500).send(`CF AI error: ${err.errors?.[0]?.message || response.statusText}`);
      return;
    }

    console.log(response)
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('image/png')) {
      const imageBuffer = await response.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      res.json({ image: base64Image });
    } else {
      const data: GenerateImageResponse = await response.json();
      if (data.result) {
        res.json({ image: data.result });
      } else {
        res.status(500).send('No image generated, model may be unavailable.');
      }
    }
  } catch (err) {
    const error = err as Error;
    res.status(500).send(`Unexpected error occurred: ${error.message}`);
  }
}
