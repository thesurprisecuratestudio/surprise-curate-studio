// api/admin-login.js
import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { createSessionCookie } from "../lib/adminSession.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: admin, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("username", username)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    // Always run bcrypt.compare even if admin not found, to avoid timing-based
    // username enumeration.
    const hash = admin?.password_hash || "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
    const valid = await bcrypt.compare(password, hash);

    if (!admin || !valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const cookie = createSessionCookie(admin.id, admin.username);
    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ success: true, username: admin.username, full_name: admin.full_name });
  } catch (err) {
    console.error("admin-login error:", err.message);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
}
