// public/js/booking.js
(function () {
  let currentStep = 1;
  const TOTAL_STEPS = 4;
  let magnetTypes = [];
  let addons = [];
  let activeTerms = null;
  let settings = {};

  document.addEventListener("scs:partials-ready", init);

  async function init() {
    await window.scsReady;
    const supabase = window.scsSupabase;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      document.getElementById("login-gate").style.display = "block";
      document.getElementById("gate-login-btn").addEventListener("click", async () => {
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.href },
        });
      });
      supabase.auth.onAuthStateChange((_e, s) => { if (s) window.location.reload(); });
      return;
    }

    document.getElementById("booking-form").style.display = "block";
    await loadReferenceData();
    renderMagnetTypes();
    renderAddons();
    renderTerms();
    bindStepNav();
    bindAddonPricing();
    bindSubmit();
  }

  async function loadReferenceData() {
    const supabase = window.scsSupabase;
    const [{ data: mt }, { data: ad }, { data: tv }, { data: st }] = await Promise.all([
      supabase.from("magnet_types").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("addons").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("terms_versions").select("*").eq("is_active", true).limit(1).single(),
      supabase.from("app_settings").select("*"),
    ]);
    magnetTypes = mt || [];
    addons = ad || [];
    activeTerms = tv || null;
    settings = Object.fromEntries((st || []).map((s) => [s.key, s.value]));
  }

  function renderMagnetTypes() {
    const mount = document.getElementById("magnet-type-group");
    mount.innerHTML = magnetTypes.map((m, i) => `
      <label class="option-tile">
        <input type="radio" name="magnet_type" value="${m.name}" ${i === 0 ? "" : ""} required>
        ${m.name}
      </label>`).join("");
  }

  function renderAddons() {
    const mount = document.getElementById("addons-group");
    if (!addons.length) {
      mount.innerHTML = `<div class="option-tile"><input type="checkbox" name="addon_none" checked disabled> Not Required</div>`;
      return;
    }
    mount.innerHTML = addons.map((a) => `
      <label class="option-tile" style="justify-content:space-between">
        <span><input type="checkbox" class="addon-check" data-id="${a.id}" data-price="${a.price}" data-name="${a.name}"> ${a.name}</span>
        <span class="muted">₹${a.price} ${a.unit_label}</span>
      </label>`).join("") +
      `<label class="option-tile"><input type="checkbox" name="addon_none" id="addon-none-check"> Not Required</label>`;
  }

  function renderTerms() {
    const mount = document.getElementById("terms-content");
    mount.textContent = activeTerms?.content || "Terms will be shared with you before your event.";
    const upiDisplay = document.getElementById("upi-id-display");
    if (upiDisplay) upiDisplay.textContent = settings.upi_id || "9940159165@ybl";
  }

  function bindAddonPricing() {
    document.getElementById("addons-group").addEventListener("change", (e) => {
      if (e.target.id === "addon-none-check" && e.target.checked) {
        document.querySelectorAll(".addon-check").forEach((c) => (c.checked = false));
      } else if (e.target.classList.contains("addon-check") && e.target.checked) {
        const noneCheck = document.getElementById("addon-none-check");
        if (noneCheck) noneCheck.checked = false;
      }
      updatePriceSummary();
    });
    document.querySelector('input[name="confirmed_magnet_count"]').addEventListener("input", updatePriceSummary);
  }

  function getSelectedAddons() {
    return Array.from(document.querySelectorAll(".addon-check:checked")).map((c) => ({
      id: c.dataset.id,
      name: c.dataset.name,
      price: Number(c.dataset.price),
    }));
  }

  function updatePriceSummary() {
    const selected = getSelectedAddons();
    const addonsTotal = selected.reduce((sum, a) => sum + a.price, 0);
    const mount = document.getElementById("price-summary");
    const advRule = settings.advance_payment || { type: "percentage", value: 30, min_amount: 500 };
    mount.innerHTML = `
      <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:8px">
        <span class="muted">Selected Add-ons</span><span>${selected.length ? selected.map((a) => a.name).join(", ") : "None"}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-weight:700">
        <span>Add-ons Total</span><span>₹${addonsTotal}</span>
      </div>
      <div class="hint" style="margin-top:8px">Final magnet stall pricing will be confirmed separately as discussed. Advance suggested: ~${advRule.value}${advRule.type === "percentage" ? "%" : " Rs"} (min ₹${advRule.min_amount}).</div>
    `;
  }

  function bindStepNav() {
    document.getElementById("btn-next").addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      if (currentStep === TOTAL_STEPS - 1) updatePriceSummary();
      goToStep(currentStep + 1);
    });
    document.getElementById("btn-prev").addEventListener("click", () => goToStep(currentStep - 1));
  }

  function validateStep(step) {
    const panel = document.querySelector(`.step-panel[data-panel="${step}"]`);
    const inputs = panel.querySelectorAll("input[required], select[required], textarea[required]");
    for (const input of inputs) {
      if (!input.checkValidity()) {
        input.reportValidity();
        return false;
      }
    }
    return true;
  }

  function goToStep(step) {
    if (step < 1 || step > TOTAL_STEPS) return;
    document.querySelectorAll(".step-panel").forEach((p) => (p.style.display = "none"));
    document.querySelector(`.step-panel[data-panel="${step}"]`).style.display = "block";
    document.querySelectorAll(".step").forEach((s) => {
      const n = Number(s.dataset.step);
      s.classList.toggle("active", n === step);
      s.classList.toggle("done", n < step);
    });
    document.getElementById("btn-prev").style.visibility = step === 1 ? "hidden" : "visible";
    document.getElementById("btn-next").style.display = step === TOTAL_STEPS ? "none" : "inline-flex";
    document.getElementById("btn-submit").style.display = step === TOTAL_STEPS ? "inline-flex" : "none";
    currentStep = step;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bindSubmit() {
    document.getElementById("booking-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateStep(TOTAL_STEPS)) return;

      const submitBtn = document.getElementById("btn-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting…";

      try {
        const supabase = window.scsSupabase;
        const { data: { session } } = await supabase.auth.getSession();
        const form = document.getElementById("booking-form");
        const fd = new FormData(form);

        const selectedAddons = getSelectedAddons();
        const addonsTotal = selectedAddons.reduce((s, a) => s + a.price, 0);

        // 1. Upload payment screenshot to PRIVATE bucket first
        const file = fd.get("payment_screenshot");
        const ext = file.name.split(".").pop();
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-screenshots").upload(path, file, { upsert: false });
        if (upErr) throw upErr;

        // 2. Insert booking row (RLS ensures customer_user_id = auth.uid())
        const payload = {
          customer_user_id: session.user.id,
          customer_name: fd.get("customer_name"),
          customer_email: fd.get("customer_email"),
          customer_mobile: fd.get("customer_mobile"),
          event_type: fd.get("event_type"),
          event_date: fd.get("event_date"),
          event_time: fd.get("event_time"),
          guest_count: fd.get("guest_count") ? Number(fd.get("guest_count")) : null,
          event_venue: fd.get("event_venue"),
          magnet_type: fd.get("magnet_type"),
          confirmed_magnet_count: Number(fd.get("confirmed_magnet_count")),
          extra_magnets_range: fd.get("extra_magnets_range") || null,
          selected_addons: selectedAddons,
          total_amount: addonsTotal,
          advance_required: 0,
          advance_paid: Number(fd.get("advance_paid")),
          terms_version_id: activeTerms?.id || null,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          payment_status: "submitted",
          payment_screenshot_path: path,
          payment_txn_id: fd.get("payment_txn_id") || null,
          payment_datetime: new Date().toISOString(),
        };

        const { data: booking, error: insErr } = await supabase
          .from("bookings")
          .insert(payload)
          .select()
          .single();
        if (insErr) throw insErr;

        // 3. Notify admin via Telegram (server-side, protects bot token)
        fetch("/api/telegram-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: booking.id }),
        }).catch(() => {});

        document.getElementById("booking-form").style.display = "none";
        document.getElementById("success-card").style.display = "block";
        document.getElementById("success-code").textContent = `Booking Reference: ${booking.booking_code}`;
      } catch (err) {
        console.error(err);
        scsToast(err.message || "Something went wrong. Please try again.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Booking ✅";
      }
    });
  }
})();
