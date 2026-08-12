// api/admin-screenshot-url.js
// Returns a short-lived signed URL so the admin can view a customer's
// payment screenshot, without making the whole bucket public.
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { verifySession } from "../lib/adminSession.js";

export default async function handler(req, res) {
  const session = verifySession(req.headers.cookie);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const { path } = req.query;
  if (!path) return res.status(400).json({ error: "path required" });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from("payment-screenshots")
    .createSignedUrl(path, 60 * 5); // 5-minute link

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ url: data.signedUrl });
}
