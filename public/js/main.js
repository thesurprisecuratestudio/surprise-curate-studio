// public/js/main.js
// Shared across all customer-facing pages: mobile nav toggle, Google auth
// state, header login/logout button, and small utilities.

function scsToast(message, type = "info") {
  let el = document.getElementById("scs-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "scs-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.background = type === "error" ? "#d64545" : "#202238";
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3200);
}

function scsFormatCurrency(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function scsInitMobileNav() {
  const toggle = document.querySelector(".menu-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => links.classList.toggle("open"));
}

async function scsInitAuthHeader() {
  await window.scsReady;
  const supabase = window.scsSupabase;
  const slot = document.getElementById("auth-slot");
  if (!slot) return;

  function render(session) {
    if (session?.user) {
      const name = session.user.user_metadata?.full_name || session.user.email;
      const avatar = session.user.user_metadata?.avatar_url;
      slot.innerHTML = `
        <div style="position:relative">
          <button id="scs-user-btn" class="btn btn-outline btn-sm" style="gap:8px">
            ${avatar ? `<img src="${avatar}" style="width:20px;height:20px;border-radius:50%">` : "👤"}
            <span>${name.split(" ")[0]}</span>
          </button>
          <div id="scs-user-menu" style="display:none;position:absolute;right:0;top:44px;background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow);min-width:180px;overflow:hidden;z-index:60">
            <a href="/account.html" style="display:block;padding:12px 16px;font-size:13.5px;font-weight:600">My Bookings</a>
            <button id="scs-logout-btn" style="display:block;width:100%;text-align:left;padding:12px 16px;font-size:13.5px;font-weight:600;border:0;background:none;cursor:pointer;color:#d64545">Sign Out</button>
          </div>
        </div>`;
      const btn = document.getElementById("scs-user-btn");
      const menu = document.getElementById("scs-user-menu");
      btn.addEventListener("click", () => (menu.style.display = menu.style.display === "none" ? "block" : "none"));
      document.getElementById("scs-logout-btn").addEventListener("click", async () => {
        await supabase.auth.signOut();
        scsToast("Signed out");
        setTimeout(() => (window.location.href = "/"), 400);
      });
    } else {
      slot.innerHTML = `<button id="scs-login-btn" class="btn btn-outline btn-sm">Sign in with Google</button>`;
      document.getElementById("scs-login-btn").addEventListener("click", async () => {
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin + window.location.pathname },
        });
      });
    }
  }

  const { data: { session } } = await supabase.auth.getSession();
  render(session);
  supabase.auth.onAuthStateChange((_event, session) => render(session));
}

async function scsLoadPartials() {
  const headerSlot = document.getElementById("site-header");
  const footerSlot = document.getElementById("site-footer");
  if (headerSlot) {
    headerSlot.innerHTML = await fetch("/partials/header.html").then((r) => r.text());
    const active = headerSlot.querySelector(`[data-nav="${document.body.dataset.page || ""}"]`);
    if (active) active.classList.add("active");
  }
  if (footerSlot) {
    footerSlot.innerHTML = await fetch("/partials/footer.html").then((r) => r.text());
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await scsLoadPartials();
  scsInitMobileNav();
  scsInitAuthHeader();
  document.dispatchEvent(new Event("scs:partials-ready"));
});
