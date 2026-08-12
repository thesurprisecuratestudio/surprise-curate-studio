// public/js/gallery-loader.js
// Pulls published gallery images from Supabase and renders them as a grid.
// Storage bucket "gallery" must be public.

async function scsGetGalleryPublicUrl(path) {
  const { data } = window.scsSupabase.storage.from("gallery").getPublicUrl(path);
  return data.publicUrl;
}

async function scsLoadHomeGalleryPreview(mountId, limit = 8) {
  await window.scsReady;
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.innerHTML = Array.from({ length: limit }).map(() => `<div class="gallery-item skeleton"></div>`).join("");

  const { data, error } = await window.scsSupabase
    .from("gallery_images")
    .select("id, storage_path, caption")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error || !data || data.length === 0) {
    mount.innerHTML = `<p class="muted" style="grid-column:1/-1;text-align:center">Gallery photos coming soon — check back after our next event!</p>`;
    return;
  }

  mount.innerHTML = "";
  for (const img of data) {
    const url = await scsGetGalleryPublicUrl(img.storage_path);
    const el = document.createElement("div");
    el.className = "gallery-item";
    el.innerHTML = `<img src="${url}" alt="${img.caption || "Event photo"}" loading="lazy">`;
    el.addEventListener("click", () => scsOpenLightbox(url));
    mount.appendChild(el);
  }
}

function scsOpenLightbox(url) {
  let box = document.getElementById("scs-lightbox");
  if (!box) {
    box = document.createElement("div");
    box.id = "scs-lightbox";
    box.className = "lightbox";
    box.innerHTML = `<button class="lightbox-close" id="scs-lightbox-close">&times;</button><img id="scs-lightbox-img" src="">`;
    document.body.appendChild(box);
    box.addEventListener("click", (e) => { if (e.target === box) box.classList.remove("open"); });
    document.getElementById("scs-lightbox-close").addEventListener("click", () => box.classList.remove("open"));
  }
  document.getElementById("scs-lightbox-img").src = url;
  box.classList.add("open");
}
