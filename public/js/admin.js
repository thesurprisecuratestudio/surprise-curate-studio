// public/js/admin.js
(async function () {
  // ---- Auth guard ----
  const sessionRes = await fetch("/api/admin-session-check");
  if (!sessionRes.ok) {
    window.location.href = "/admin/index.html";
    return;
  }
  const session = await sessionRes.json();
  const usernameEl = document.getElementById("admin-username");
  if (usernameEl) usernameEl.textContent = session.username;

  document.getElementById("logout-btn")?.addEventListener("click", async () => {
    await fetch("/api/admin-logout", { method: "POST" });
    window.location.href = "/admin/index.html";
  });

  // ---- Tabs ----
  document.querySelectorAll(".panel-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".panel-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => (p.style.display = "none"));
      tab.classList.add("active");
      document.querySelector(`.tab-panel[data-tab-panel="${tab.dataset.tab}"]`).style.display = "block";
      if (tab.dataset.tab === "addons") loadAddons();
      if (tab.dataset.tab === "magnets") loadMagnetTypes();
      if (tab.dataset.tab === "terms") loadTerms();
      if (tab.dataset.tab === "settings") loadSettings();
    });
  });

  // =====================================================================
  // BOOKINGS
  // =====================================================================
  async function loadBookings() {
    const status = document.getElementById("filter-status").value;
    const payment_status = document.getElementById("filter-payment").value;
    const search = document.getElementById("filter-search").value;
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (payment_status) params.set("payment_status", payment_status);
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin-bookings?${params.toString()}`);
    const data = await res.json();
    const bookings = data.bookings || [];
    renderStats(bookings);
    renderBookingsTable(bookings);
  }

  function renderStats(bookings) {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.booking_status === "pending").length;
    const confirmed = bookings.filter((b) => b.booking_status === "confirmed").length;
    const revenue = bookings.reduce((s, b) => s + Number(b.advance_paid || 0), 0);
    document.getElementById("stat-cards").innerHTML = `
      <div class="stat-card"><div class="num">${total}</div><div class="lbl">Total Bookings</div></div>
      <div class="stat-card"><div class="num">${pending}</div><div class="lbl">Pending Review</div></div>
      <div class="stat-card"><div class="num">${confirmed}</div><div class="lbl">Confirmed</div></div>
      <div class="stat-card"><div class="num">₹${revenue.toLocaleString("en-IN")}</div><div class="lbl">Advance Collected</div></div>
    `;
  }

  function renderBookingsTable(bookings) {
    const tbody = document.getElementById("bookings-tbody");
    if (!bookings.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="muted">No bookings found.</td></tr>`;
      return;
    }
    tbody.innerHTML = bookings.map((b) => `
      <tr>
        <td>${b.booking_code}</td>
        <td>${b.customer_name}<br><span class="muted" style="font-size:11.5px">${b.customer_mobile}</span></td>
        <td>${b.event_type}</td>
        <td>${b.event_date}<br><span class="muted" style="font-size:11.5px">${b.event_time}</span></td>
        <td>${b.magnet_type}<br><span class="muted" style="font-size:11.5px">${b.confirmed_magnet_count} pcs</span></td>
        <td>₹${b.advance_paid}
          ${b.payment_screenshot_path ? `<br><button class="link-btn" data-view-ss="${b.payment_screenshot_path}">View screenshot</button>` : ""}
        </td>
        <td>
          <select class="mini-select" data-payment-select="${b.id}">
            <option value="submitted" ${b.payment_status === "submitted" ? "selected" : ""}>Submitted</option>
            <option value="verified" ${b.payment_status === "verified" ? "selected" : ""}>Verified</option>
            <option value="rejected" ${b.payment_status === "rejected" ? "selected" : ""}>Rejected</option>
          </select>
        </td>
        <td>
          <select class="mini-select" data-status-select="${b.id}">
            <option value="pending" ${b.booking_status === "pending" ? "selected" : ""}>Pending</option>
            <option value="confirmed" ${b.booking_status === "confirmed" ? "selected" : ""}>Confirmed</option>
            <option value="finished" ${b.booking_status === "finished" ? "selected" : ""}>Finished</option>
            <option value="cancelled" ${b.booking_status === "cancelled" ? "selected" : ""}>Cancelled</option>
          </select>
        </td>
        <td><span class="badge badge-${b.booking_status}">${b.booking_status}</span></td>
      </tr>
    `).join("");

    tbody.querySelectorAll("[data-view-ss]").forEach((btn) => {
      btn.addEventListener("click", () => viewScreenshot(btn.dataset.viewSs));
    });
    tbody.querySelectorAll("[data-payment-select]").forEach((sel) => {
      sel.addEventListener("change", () => updateBooking(sel.dataset.paymentSelect, { payment_status: sel.value }));
    });
    tbody.querySelectorAll("[data-status-select]").forEach((sel) => {
      sel.addEventListener("change", () => updateBooking(sel.dataset.statusSelect, { booking_status: sel.value }));
    });
  }

  async function updateBooking(id, fields) {
    const res = await fetch("/api/admin-bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    if (res.ok) {
      scsToast?.("Booking updated");
      loadBookings();
    } else {
      alert("Update failed");
    }
  }

  async function viewScreenshot(path) {
    const res = await fetch(`/api/admin-screenshot-url?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (!data.url) return alert("Could not load screenshot");
    document.getElementById("screenshot-modal-img").src = data.url;
    document.getElementById("screenshot-modal").classList.add("open");
  }
  document.getElementById("screenshot-modal-close")?.addEventListener("click", () => {
    document.getElementById("screenshot-modal").classList.remove("open");
  });

  document.getElementById("filter-apply")?.addEventListener("click", loadBookings);

  // =====================================================================
  // ADDONS
  // =====================================================================
  async function loadAddons() {
    const res = await fetch("/api/admin-content?table=addons");
    const { rows } = await res.json();
    document.getElementById("addons-tbody").innerHTML = (rows || []).map((a) => `
      <tr>
        <td>${a.name}</td>
        <td>₹${a.price}</td>
        <td>${a.unit_label || ""}</td>
        <td><input type="checkbox" data-toggle-active="${a.id}" data-table="addons" ${a.is_active ? "checked" : ""}></td>
        <td><button class="link-btn" data-delete="${a.id}" data-table="addons">Delete</button></td>
      </tr>
    `).join("") || `<tr><td colspan="5" class="muted">No add-ons yet.</td></tr>`;
    bindRowActions();
  }

  document.getElementById("addon-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await fetch("/api/admin-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "addons",
        record: { name: fd.get("name"), price: Number(fd.get("price")), unit_label: fd.get("unit_label") || "per item", is_active: true },
      }),
    });
    e.target.reset();
    loadAddons();
  });

  // =====================================================================
  // MAGNET TYPES
  // =====================================================================
  async function loadMagnetTypes() {
    const res = await fetch("/api/admin-content?table=magnet_types");
    const { rows } = await res.json();
    document.getElementById("magnets-tbody").innerHTML = (rows || []).map((m) => `
      <tr>
        <td>${m.name}</td>
        <td><input type="checkbox" data-toggle-active="${m.id}" data-table="magnet_types" ${m.is_active ? "checked" : ""}></td>
        <td><button class="link-btn" data-delete="${m.id}" data-table="magnet_types">Delete</button></td>
      </tr>
    `).join("") || `<tr><td colspan="3" class="muted">No magnet types yet.</td></tr>`;
    bindRowActions();
  }

  document.getElementById("magnet-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await fetch("/api/admin-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "magnet_types", record: { name: fd.get("name"), is_active: true } }),
    });
    e.target.reset();
    loadMagnetTypes();
  });

  // ---- shared row actions (toggle active / delete) for addons & magnets ----
  function bindRowActions() {
    document.querySelectorAll("[data-toggle-active]").forEach((cb) => {
      cb.onchange = async () => {
        await fetch("/api/admin-content", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: cb.dataset.table, id: cb.dataset.toggleActive, record: { is_active: cb.checked } }),
        });
      };
    });
    document.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Delete this item?")) return;
        await fetch("/api/admin-content", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: btn.dataset.table, id: btn.dataset.delete }),
        });
        if (btn.dataset.table === "addons") loadAddons();
        if (btn.dataset.table === "magnet_types") loadMagnetTypes();
      };
    });
  }

  // =====================================================================
  // TERMS
  // =====================================================================
  async function loadTerms() {
    const res = await fetch("/api/admin-content?table=terms_versions");
    const { rows } = await res.json();
    const sorted = (rows || []).sort((a, b) => b.version_number - a.version_number);
    const active = sorted.find((t) => t.is_active);
    document.getElementById("terms-textarea").value = active?.content || "";
    document.getElementById("terms-history").innerHTML = `
      <h4 style="font-size:13px;color:var(--muted)">Version History</h4>
      ${sorted.map((t) => `<div style="padding:8px 0;border-bottom:1px solid var(--line);font-size:13px">
        v${t.version_number} ${t.is_active ? '<span class="badge badge-confirmed">Active</span>' : ""}
      </div>`).join("")}
    `;
  }

  document.getElementById("publish-terms-btn")?.addEventListener("click", async () => {
    const content = document.getElementById("terms-textarea").value.trim();
    if (!content) return alert("Terms content cannot be empty");
    const res = await fetch("/api/admin-content?table=terms_versions");
    const { rows } = await res.json();
    const nextVersion = Math.max(0, ...(rows || []).map((r) => r.version_number)) + 1;
    await fetch("/api/admin-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "terms_versions", record: { version_number: nextVersion, content, is_active: true } }),
    });
    scsToast?.("New terms version published");
    loadTerms();
  });

  // =====================================================================
  // SETTINGS
  // =====================================================================
  async function loadSettings() {
    const res = await fetch("/api/admin-content?table=app_settings");
    const { rows } = await res.json();
    const map = Object.fromEntries((rows || []).map((r) => [r.key, r.value]));
    document.getElementById("setting-upi").value = map.upi_id || "";
    const adv = map.advance_payment || { type: "percentage", value: 30, min_amount: 500 };
    document.getElementById("setting-adv-type").value = adv.type;
    document.getElementById("setting-adv-value").value = adv.value;
    document.getElementById("setting-adv-min").value = adv.min_amount;
  }

  document.getElementById("save-settings-btn")?.addEventListener("click", async () => {
    const upi = document.getElementById("setting-upi").value.trim();
    const adv = {
      type: document.getElementById("setting-adv-type").value,
      value: Number(document.getElementById("setting-adv-value").value),
      min_amount: Number(document.getElementById("setting-adv-min").value),
    };
    await fetch("/api/admin-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "app_settings", key: "upi_id", record: { value: upi } }),
    });
    await fetch("/api/admin-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "app_settings", key: "advance_payment", record: { value: adv } }),
    });
    scsToast?.("Settings saved");
  });

  // ---- init ----
  loadBookings();
})();

function scsToast(msg) {
  let el = document.getElementById("scs-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "scs-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2600);
}
