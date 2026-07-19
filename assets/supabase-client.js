/* ============================================================
   SUPABASE CLIENT — fill these in from your Supabase project
   Settings → API → Project URL / anon public key
   ============================================================ */
const SUPABASE_URL = 'https://apbmnwrodzmrfywswhti.supabase.co';       // e.g. https://abcxyz.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwYm1ud3JvZHptcmZ5d3N3aHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MjE4NDUsImV4cCI6MjA5OTk5Nzg0NX0.q3951f5NBsCu2sFHVRJO1oBMjPdUPWTL3GFMX7lC2gU';

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
