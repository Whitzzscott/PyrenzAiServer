import { supabase } from '../../Supabase.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from "../../utility.js";

interface AdTokenPayload {
  ad_watch_key: string;
  created_at: string;
  pressed_at: string;
}

export async function validateAdWatchKey(user_uuid: string, ad_watch_key: string): Promise<boolean> {
  const { data: userData, error: fetchError } = await supabase
    .from('user_data')
    .select('ad_watch_key')
    .eq('user_uuid', user_uuid)
    .single();

  if (fetchError) {
    console.error('Error fetching user data:', fetchError);
    return false;
  }

  if (!userData.ad_watch_key) {
    return false;
  }

  try {
    const decodedRequest = jwt.verify(ad_watch_key, JWT_SECRET as string) as AdTokenPayload;
    const { ad_watch_key: requestAdWatchKey } = decodedRequest;

    const decoded = jwt.verify(userData.ad_watch_key, JWT_SECRET as string) as AdTokenPayload;
    const { ad_watch_key: dbAdWatchKey, pressed_at: dbPressedAt, created_at } = decoded;

    console.log('Request ad_watch_key:', requestAdWatchKey);
    console.log('Database ad_watch_key:', dbAdWatchKey);
    console.log('Request pressed_at:', dbPressedAt);
    console.log('Database pressed_at:', dbPressedAt);

    if (requestAdWatchKey !== dbAdWatchKey) {
      console.error('ad_watch_key mismatch:', { requestAdWatchKey, dbAdWatchKey });
      return false;
    }

    if (Date.now() - new Date(created_at).getTime() > 15000) {
      console.error('ad_watch_key expired');
      return false;
    }

    const { error: updateError } = await supabase
      .from('user_data')
      .update({ ad_watch_key: null })
      .eq('user_uuid', user_uuid);

    if (updateError) {
      console.error('Error updating ad_watch_key:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Invalid ad_watch_key:', error);
    return false;
  }
}
