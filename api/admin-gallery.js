// api/admin-gallery.js
// GET    -> list gallery images (newest first)
// POST   { filename, contentType, dataBase64, category, caption } -> upload to
//          'gallery' storage bucket + insert a gallery_images row
// PATCH  { id, is_published? , caption?, category?, sort_order? } -> update a row
// DELETE ?id=  -> remove row + its storage object
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { verifySession } from "../lib/adminSession.js";

export const config = {
  api: { bodyParser: { sizeLimit: "8mb" } }, // base64 images can be large-ish
};

export default async function handler(req, res) {
  const session = verifySession(req.headers.cookie);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const images = (data || []).map((img) => ({
      ...img,
      public_url: supabase.storage.from("gallery").getPublicUrl(img.storage_path).data.publicUrl,
    }));
    return res.status(200).json({ images });
  }

  if (req.method === "POST") {
    const { filename, contentType, dataBase64, category, caption } = req.body || {};
    if (!filename || !dataBase64) {
      return res.status(400).json({ error: "filename and dataBase64 are required" });
    }
    try {
      const buffer = Buffer.from(dataBase64, "base64");
      const ext = (filename.split(".").pop() || "jpg").toLowerCase();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("gallery")
        .upload(path, buffer, { contentType: contentType || "image/jpeg", upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from("gallery_images")
        .insert({ storage_path: path, category: category || "general", caption: caption || null, is_published: true })
        .select()
        .single();
      if (error) throw error;

      return res.status(200).json({ image: data });
    } catch (err) {
      console.error("admin-gallery upload error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "PATCH") {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    const allowed = ["is_published", "caption", "category", "sort_order"];
    const updates = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));
    const { data, error } = await supabase.from("gallery_images").update(updates).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ image: data });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id required" });
    const { data: row, error: fetchErr } = await supabase.from("gallery_images").select("storage_path").eq("id", id).single();
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (row?.storage_path) {
      await supabase.storage.from("gallery").remove([row.storage_path]);
    }
    const { error } = await supabase.from("gallery_images").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", "GET, POST, PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
