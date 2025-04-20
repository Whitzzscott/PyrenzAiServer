import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "../Utils/Uility.js";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  throw new Error('Missing Supabase URL or Service Role Key in environment variables.');
}

const supabase = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string);

const createUserSupabaseClient = (accessToken: string): SupabaseClient => {
  if (!accessToken) {
    throw new Error('Access token is required for creating a user client.');
  }

  return createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

export { supabase, createUserSupabaseClient };
