import { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../Utils.js';

const decodeBase64Image = (dataString: string): Buffer => {
  const matches = dataString.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) throw new Error('Invalid base64 image format');
  return Buffer.from(matches[2], 'base64');
};

const createCharacterSchema = z.object({
  persona: z.string().min(1, 'Persona is required'),
  is_public: z.boolean(),
  is_nsfw: z.boolean(),
  name: z.string().min(1, 'Name is required'),
  model_instructions: z.string().min(1, 'Model instructions are required'),
  scenario: z.string().min(1, 'Scenario is required'),
  description: z.string().min(1, 'Description is required'),
  first_message: z.string().min(1, 'First message is required'),
  tags: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']),
  textarea_token: z.object({
    persona: z.number(),
    name: z.number(),
    model_instructions: z.number(),
    scenario: z.number(),
    description: z.number(),
    first_message: z.number(),
    tags: z.number(),
  }),
  token_total: z.number(),
  bannerImage: z.string().optional(),
  profileImage: z.string().optional(),
  auth_key: z.string().min(1, 'auth_key is required'),
});

export default async function createCharacter(req: Request, res: Response): Promise<void> {
  const accessToken = req.headers.authorization?.replace('Bearer ', '');

  if (!accessToken) {
    res.status(401).json({ error: 'No auth token provided' });
    return;
  }

  const { data: user, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !user?.user?.id) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const validation = createCharacterSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({ errors: validation.error.errors });
    return;
  }

  const { bannerImage, profileImage, auth_key, ...characterData } = validation.data;

  try {
    let bannerImageUrl: string | null = null;
    let profileImageUrl: string | null = null;

    if (bannerImage) {
      const buffer = decodeBase64Image(bannerImage);
      const path = `character-image/Banner_Image/${uuidv4()}.png`;

      const { error } = await supabase.storage
        .from('character-image')
        .upload(path, buffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('character-image')
        .getPublicUrl(path);

      bannerImageUrl = urlData.publicUrl;
    }

    if (profileImage) {
      const buffer = decodeBase64Image(profileImage);
      const path = `character-image/Profile_Image/${uuidv4()}.png`;

      const { error } = await supabase.storage
        .from('character-image')
        .upload(path, buffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('character-image')
        .getPublicUrl(path);

      profileImageUrl = urlData.publicUrl;
    }

    const payload = {
      ...characterData,
      user_uuid: user.user.id,
      auth_key,
      ...(bannerImageUrl && { bannerImage: bannerImageUrl }),
      ...(profileImageUrl && { profileImage: profileImageUrl }),
    };

    const { data: charData, error: charError } = await supabase.rpc('create_character', {
      input_data: payload,
    });

    if (charError) throw charError;

    const input_char_uuid = charData;

    const { data: chatData, error: chatError } = await supabase.rpc('create_new_chat', {
      character_uuid: input_char_uuid,
      user_uuid: user.user.id,
      auth_key,
    });
    

    if (chatError) throw chatError;

    res.status(200).json({
      message: 'Character and chat created successfully',
      character_uuid: input_char_uuid,
      chat: chatData,
    });
  } catch (err) {
    res.status(500).json({ error: `Error sending data to Supabase: ${(err as Error).message}` });
  }
}
