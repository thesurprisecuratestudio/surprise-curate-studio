// api/public-config.js
// Returns ONLY public-safe values (Supabase URL + anon key are meant to be
// public; RLS policies are what actually protect data). Never put the
// service role key, Telegram token, or admin secrets here.

export default function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
    UPI_ID: process.env.NEXT_PUBLIC_UPI_ID || "9940159165@ybl",
  });
}
