// api/admin-session-check.js
import { verifySession } from "../lib/adminSession.js";

export default function handler(req, res) {
  const session = verifySession(req.headers.cookie);
  if (!session) return res.status(401).json({ authenticated: false });
  res.status(200).json({ authenticated: true, username: session.username });
}
