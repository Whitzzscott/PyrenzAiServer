import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseProjectRef = process.env.SUPABASE_PROJECT_REF;

if (!supabaseUrl || !supabaseKey || !supabaseProjectRef) {
  throw new Error('Missing required Supabase environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabaseUrl, supabaseKey, supabase, supabaseProjectRef };
export default supabase;
