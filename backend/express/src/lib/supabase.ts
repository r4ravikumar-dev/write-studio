import {createClient} from '@supabase/supabase-js';
import {env} from '../config/env';

/**
 * The API's one Supabase client, with the service-role key: it bypasses
 * row-level security (the Studio tables deny everyone else), so every route
 * is behind requireUser and every query is scoped to the signed-in user.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {persistSession: false, autoRefreshToken: false},
});
