// Public callbacks share this function; every privileged action verifies Auth and a live session.
import { createClient } from '@supabase/supabase-js';
import { createHandler } from './server.ts';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(createHandler(admin));
