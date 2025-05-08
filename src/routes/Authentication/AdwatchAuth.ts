import { supabase } from "../Supabase.js";
import jwt from 'jsonwebtoken';
import CryptoJS from 'crypto-js';
import { JWT_SECRET } from "../utility.js";
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  minTime: 100,
  maxConcurrent: 5,
});

interface JWTPayload {
  ad_watch_key: string;
  created_at: string;
  pressed_at: string;
}

function generateAESKey(user_uuid: string): string {
  return CryptoJS.SHA256(user_uuid).toString(CryptoJS.enc.Hex);
}

function createJWT(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: '24h' });
}

export const Getadtoken = async (req: any, res: any) => {
  try {
    const { user_uuid, pressed_at } = req.body;

    if (!user_uuid || !pressed_at) {
      return res.status(400).json({ error: "user_uuid and pressed_at are required." });
    }

    const ad_watch_key = generateAESKey(user_uuid);

    const payload: JWTPayload = {
      ad_watch_key,
      created_at: new Date().toISOString(),
      pressed_at,
    };

    const token = createJWT(payload);

    const result = await limiter.schedule(() =>
      supabase
        .from('user_data')
        .update({
          ad_watch_key: token,
        })
        .eq('user_uuid', user_uuid)
    );

    const { data, error } = result;

    if (error) {
      console.error('Error updating token:', error);
      return res.status(500).json({ error: "Failed to update token." });
    }

    res.status(200).json({ success: true, ad_watch_token: token });
  } catch (err) {
    console.error('Error generating token:', err);
    res.status(500).json({ error: "Internal server error." });
  }
};
