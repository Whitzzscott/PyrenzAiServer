import jwt, { JwtPayload } from 'jsonwebtoken';
import { supabase } from '../../Utils.js'; 
import { Request } from 'express';
import { JWT_SECRET } from '../../../Utils/Uility.js'

 if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable.');
}

interface CustomJwtPayload extends JwtPayload {
  user_uuid: string;
}

export async function savePreviousMessage(
  req: Request,
  conversationId: string,
  aiMessage: string,
  characterImageUrl: string
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET as string) as CustomJwtPayload;
    const userUuid = decoded.user_uuid;

    const { data, error } = await supabase
      .from('previous_message')
      .insert([
        {
          conversation_id: conversationId,
          user_uuid: userUuid,
          message: aiMessage,
          character_image_url: characterImageUrl,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Error saving previous message:', error);
      throw new Error('Failed to save previous message');
    }

    return data;
  } catch (error) {
    console.error('Error in savePreviousMessage:', error);
    throw new Error('Failed to save previous message');
  }
}
