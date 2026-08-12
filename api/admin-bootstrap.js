// api/admin-bootstrap.js
// ONE-TIME setup endpoint to create the first admin user.
// Protected by a separate secret (BOOTSTRAP_SECRET) so it's safe to leave
// deployed — without the secret, nobody can create admin accounts.
// After first use, you can remove this file or rotate BOOTSTRAP_SECRET.
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { secret, username, password, full_name } = req.body || {};
  if (!secret || secret !== process.env.BOOTSTRAP_SECRET) {
    return res.status(401).json({ error: "Invalid bootstrap secret" });
  }
  if (!username || !password) {
    return res.status(400).json({ error: "username and password required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const supabase = getSupabaseAdmin();
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from("admin_users")
      .insert({ username, password_hash, full_name: full_name || username })
      .select("id, username, full_name")
      .single();
    if (error) throw error;
    return res.status(200).json({ success: true, admin: data });
  } catch (err) {
    console.error("admin-bootstrap error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
