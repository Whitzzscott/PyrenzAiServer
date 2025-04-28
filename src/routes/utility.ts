import { config } from 'dotenv';

config();

export const PORT = process.env.PORT;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const SUPABASE_URL = "https://cqtbishpefnfvaxheyqu.supabase.co";
export const JWT_SECRET = process.env.JWT_SECRET;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JWT_SECRET || !OPENROUTER_API_KEY || !OPENAI_API_KEY) {
    console.log(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    throw new Error('Missing Supabase URL or Service Role Key in environment variables.');
}
  