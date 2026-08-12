# The Surprise & Curate Studio — Booking Website

Live Fridge Magnet Stall booking website. Full frontend + backend, Supabase + Vercel, matching your Murugan Trader stack.

## 📁 Structure

```
public/          → customer-facing frontend (HTML/CSS/JS, no build step)
  index.html, booking.html, gallery.html, services.html, weddings.html,
  contact.html, terms.html, privacy.html, account.html
  css/styles.css
  js/            → supabaseClient.js, main.js, booking.js, admin.js, gallery-loader.js
  partials/      → header.html, footer.html (loaded dynamically)
admin/           → admin panel (login + dashboard)
api/             → Vercel serverless functions (Node.js)
lib/             → shared server-side helpers (never shipped to browser)
supabase/migrations/  → SQL schema + seed data
vercel.json      → security headers
.env.example     → all environment variables needed
```

## 🚀 Setup — Step by Step

### 1. Supabase Project

1. Create a project at supabase.com (free tier is fine to start).
2. Go to **SQL Editor** → paste and run `supabase/migrations/001_init.sql`.
3. Then run `supabase/migrations/002_seed.sql` (adds your real magnet types & add-ons from booking_form.md).
4. Go to **Storage** → create 3 buckets:
   - `gallery` → **Public** bucket
   - `payment-screenshots` → **Private** bucket (do NOT make public)
   - `logo` → **Public** bucket
5. Go to **Settings → API** → copy:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret, server-only)

### 2. Google Login for Customers (Supabase Auth)

1. Supabase Dashboard → **Authentication → Providers → Google** → enable it.
2. Create OAuth credentials in Google Cloud Console (APIs & Services → Credentials → OAuth Client ID → Web application).
3. Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
4. Paste the Google Client ID + Secret into Supabase's Google provider settings.
5. In Supabase → Authentication → URL Configuration → add your live domain (e.g. `https://yourdomain.com`) to **Redirect URLs**.

No code changes needed — `booking.js` and `account.html` already call `signInWithOAuth({ provider: "google" })`.

### 3. Telegram Admin Alerts

1. Message **@BotFather** on Telegram → `/newbot` → get your bot token.
2. Send any message to your new bot once.
3. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` → find your `chat.id`.
4. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in Vercel env vars.

### 4. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Import the repo in Vercel.
3. In **Project Settings → Environment Variables**, add everything from `.env.example` with your real values.
4. Deploy.

### 5. Create Your First Admin Login

After deploying, call the bootstrap endpoint **once** (use Postman, curl, or a quick browser fetch):

```bash
curl -X POST https://yourdomain.com/api/admin-bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "YOUR_BOOTSTRAP_SECRET",
    "username": "admin",
    "password": "choose-a-strong-password",
    "full_name": "Dhineshkumar"
  }'
```

Then go to `https://yourdomain.com/admin/index.html` and sign in.

⚠️ After creating your admin account, you can leave `/api/admin-bootstrap` deployed (it's protected by `BOOTSTRAP_SECRET`), or delete `api/admin-bootstrap.js` and redeploy for extra safety.

### 6. Add Your Logo

Upload your logo image to the `logo` Supabase bucket, then replace the `#logo-mark` placeholder in `public/partials/header.html` with an `<img>` tag pointing to its public URL.

## 🔐 Security Notes (matches your Murugan Trader remediation pattern)

- Admin password is bcrypt-hashed, never stored in plaintext.
- Admin session is an httpOnly, signed cookie — not readable by JS, not forgeable without `ADMIN_SESSION_SECRET`.
- `SUPABASE_SERVICE_ROLE_KEY` and `TELEGRAM_BOT_TOKEN` only ever live in `/api` server functions — never sent to the browser.
- Customer data access is enforced by Postgres **Row Level Security** — a customer can only ever see their own bookings, even if someone tampers with frontend JS.
- Payment screenshots are in a **private** bucket; admin views them via a 5-minute signed URL, not a public link.
- `vercel.json` sets standard security headers (HSTS, X-Frame-Options, nosniff, etc.)

## 🧩 What's Editable From the Admin Panel (no code changes needed)

- Bookings: view, search, filter, verify payment, change status
- Add-ons: add/edit price, activate/deactivate
- Magnet Types: add/edit, activate/deactivate
- Terms & Conditions: publish new versions (old bookings keep the version they agreed to)
- Settings: UPI ID, advance payment rule (% or fixed, minimum amount)

## 📝 Next Steps / Things You May Want to Add Later

- Gallery image upload UI in admin panel (currently: upload via Supabase Storage dashboard directly into the `gallery` bucket, then insert a row in `gallery_images` table with the storage path — or I can build an upload UI next)
- WhatsApp/SMS confirmation to customer on booking confirm
- PDF invoice generation
- Razorpay online payment (currently UPI + manual screenshot verification, same pattern as your other projects)
- Logo upload (currently placeholder "S&C" text mark in header)

---
Built to match your existing stack: Supabase + Vercel + vanilla JS, no build tools, deployable exactly like Murugan Trader and Sowmiya Travels.
