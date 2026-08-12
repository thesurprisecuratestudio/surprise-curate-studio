// api/telegram-notify.js
// Called by the frontend right after a booking is inserted. Fetches the
// booking from DB (server-side, trusted) and pushes a formatted alert to
// the admin's Telegram chat. Bot token never touches the browser.
import { getSupabaseAdmin } from "../lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { booking_id } = req.body || {};
  if (!booking_id) return res.status(400).json({ error: "booking_id required" });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured — skipping notify");
    return res.status(200).json({ skipped: true });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: booking, error } = await supabase.from("bookings").select("*").eq("id", booking_id).single();
    if (error) throw error;

    const addonsList = (booking.selected_addons || []).map((a) => `• ${a.name} (₹${a.price})`).join("\n") || "None";

    const text =
      `🔔 *New Booking Received*\n\n` +
      `*Ref:* ${booking.booking_code}\n` +
      `*Name:* ${booking.customer_name}\n` +
      `*Mobile:* ${booking.customer_mobile}\n` +
      `*Event:* ${booking.event_type} on ${booking.event_date} at ${booking.event_time}\n` +
      `*Venue:* ${booking.event_venue}\n` +
      `*Magnet Type:* ${booking.magnet_type}\n` +
      `*Confirmed Count:* ${booking.confirmed_magnet_count}\n` +
      `*Extra Magnets:* ${booking.extra_magnets_range || "Not required"}\n` +
      `*Add-ons:*\n${addonsList}\n` +
      `*Advance Paid:* ₹${booking.advance_paid}\n\n` +
      `Please verify payment in the admin panel.`;

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });

    if (!tgRes.ok) {
      const errBody = await tgRes.text();
      console.error("Telegram API error:", errBody);
      return res.status(200).json({ sent: false });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error("telegram-notify error:", err.message);
    // Never fail the booking flow because of a notification error
    return res.status(200).json({ sent: false });
  }
}
