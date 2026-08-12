// api/admin-content.js
// Generic content manager for admin-editable tables.
// GET    ?table=addons|magnet_types|app_settings|terms_versions
// POST   { table, record }              -> insert
// PATCH  { table, id|key, record }      -> update
// DELETE { table, id }                  -> delete
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { verifySession } from "../lib/adminSession.js";

const ALLOWED_TABLES = ["addons", "magnet_types", "app_settings", "terms_versions", "gallery_images"];

export default async function handler(req, res) {
  const session = verifySession(req.headers.cookie);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const table = req.method === "GET" ? req.query.table : req.body?.table;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ error: "Invalid table" });
  }

  const supabase = getSupabaseAdmin();

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase.from(table).select("*").order("sort_order", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return res.status(200).json({ rows: data });
    }

    if (req.method === "POST") {
      const { record } = req.body;
      const { data, error } = await supabase.from(table).insert(record).select().single();
      if (error) throw error;
      return res.status(200).json({ row: data });
    }

    if (req.method === "PATCH") {
      const { id, key, record } = req.body;
      const pk = table === "app_settings" ? "key" : "id";
      const pkValue = table === "app_settings" ? key : id;

      // For terms_versions: publishing a new active version deactivates the rest
      if (table === "terms_versions" && record?.is_active === true) {
        await supabase.from("terms_versions").update({ is_active: false }).neq("id", pkValue);
      }

      const { data, error } = await supabase.from(table).update(record).eq(pk, pkValue).select().single();
      if (error) throw error;
      return res.status(200).json({ row: data });
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("admin-content error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
