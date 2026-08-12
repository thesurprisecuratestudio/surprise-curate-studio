// api/admin-bookings.js
// GET  ?status=&from=&to=&search=   -> list bookings (filters optional)
// PATCH { id, ...fields }           -> update a booking (status, payment_status, etc.)
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";
import { verifySession } from "../lib/adminSession.js";

export default async function handler(req, res) {
  const session = verifySession(req.headers.cookie);
  if (!session) return res.status(401).json({ error: "Not authenticated" });

  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const { status, payment_status, from, to, search } = req.query;
    let query = supabase.from("bookings").select("*").order("created_at", { ascending: false });

    if (status) query = query.eq("booking_status", status);
    if (payment_status) query = query.eq("payment_status", payment_status);
    if (from) query = query.gte("event_date", from);
    if (to) query = query.lte("event_date", to);
    if (search) query = query.or(`customer_name.ilike.%${search}%,customer_mobile.ilike.%${search}%,booking_code.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ bookings: data });
  }

  if (req.method === "PATCH") {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ error: "Booking id required" });

    // Only allow specific fields to be updated from this endpoint
    const allowed = ["booking_status", "payment_status", "advance_required", "total_amount", "event_time", "event_date", "guest_count"];
    const updates = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from("bookings").update(updates).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ booking: data });
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}
