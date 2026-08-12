// public/js/supabaseClient.js
// Shared Supabase client for the browser.
// SUPABASE_URL and SUPABASE_ANON_KEY are PUBLIC values (safe in frontend) —
// real security comes from Row Level Security policies in the database,
// never from hiding these two values. They are fetched from /api/public-config
// (sourced from Vercel env vars) so nothing is hardcoded in this file.
//
// Loaded from CDN in each HTML page BEFORE this script:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

window.scsReady = (async function initSupabase() {
  const res = await fetch("/api/public-config");
  const cfg = await res.json();

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.error("Supabase config missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel env vars.");
  }

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,     // keeps customer logged in after refresh
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  window.scsSupabase = client;
  window.scsConfig = cfg;
  document.dispatchEvent(new Event("scs:ready"));
  return client;
})();
