/* ============================================================
   SUPABASE CLIENT — fill these in from your Supabase project
   Settings → API → Project URL / anon public key
   ============================================================ */
const SUPABASE_URL = 'https://apbmnwrodzmrfywswhti.supabase.co';       // e.g. https://abcxyz.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_InJi3bG8QSmpI5hRJWsWiA_t7vMZDEZ';

let supabase = null;
let supabaseReady = false;

if (SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supabaseReady = true;
} else {
  console.warn('[Human Legacy] Supabase is not configured yet. Fill in SUPABASE_URL and SUPABASE_ANON_KEY in assets/supabase-client.js — see README-SETUP.md.');
}

function requireSupabase(){
  if(!supabaseReady){
    alert('This feature needs Supabase to be connected first. See README-SETUP.md for a 5-minute setup.');
    return false;
  }
  return true;
}
