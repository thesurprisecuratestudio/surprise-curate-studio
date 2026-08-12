// lib/adminSession.js
// Simple stateless httpOnly session cookie for the admin panel.
// Signed with ADMIN_SESSION_SECRET so it can't be forged; not stored in DB.
import crypto from "crypto";

const COOKIE_NAME = "scs_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionCookie(adminId, username) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET not set");
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${adminId}|${username}|${expires}`;
  const sig = sign(payload, secret);
  const value = Buffer.from(`${payload}|${sig}`).toString("base64url");
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function verifySession(cookieHeader) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!cookieHeader || !secret) return null;

  const match = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;

  try {
    const value = match.split("=")[1];
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const [adminId, username, expires, sig] = decoded.split("|");
    const payload = `${adminId}|${username}|${expires}`;
    const expectedSig = sign(payload, secret);
    if (sig !== expectedSig) return null;
    if (Date.now() > Number(expires)) return null;
    return { adminId, username };
  } catch {
    return null;
  }
}
