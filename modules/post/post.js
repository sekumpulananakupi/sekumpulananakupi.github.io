const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function formatDate(dateString) {
  if (!dateString) return "";

  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function getPostConfig(type) {
  const configs = {
    info: {
      table: "informasi_kampus",
      columns: "id, judul, isi, gambar, kategori, created_at"
    },
    wiki: {
      table: "wiki_kampus",
      columns: "id, judul, isi, gambar, kategori, created_at"
    },
    job: {
      table: "lowongan_kerja",
      columns: "id, posisi, perusahaan, lokasi, deskripsi, gambar, link, created_at"
    }
  };

  return configs[type] || null;
}

async function loadPost() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const id = params.get("id");
  const postDetail = document.getElementById("postDetail");

  if (!postDetail) return;

  if (!type || !id) {
    showPostError("Artikel tidak ditemukan.");
    return;
  }

  const config = getPostConfig(type);

  if (!config) {
    showPostError("Jenis artikel tidak valid.");
    return;
  }

  postDetail.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      Memuat artikel...
    </div>
  `;

  const cacheKey = `post_${type}_${id}_v2`;
  const cached = getCache(cacheKey, 1440);

  if (cached) {
    renderPost(cached.post, cached.relations, type);
    return;
  }

  const [{ data, error }, relations] = await Promise.all([
    supabaseClient
      .from(config.table)
      .select(config.columns)
      .eq("id", id)
      .single(),

    loadRelations(type, id)
  ]);

  if (error || !data) {
    console.error("Gagal memuat artikel:", error);
    showPostError("Gagal memuat artikel.");
    return;
  }

  setCache(cacheKey, {
    post: data,
    relations
  });

  renderPost(data, relations, type);
}

async function loadRelations(type, artikelId) {
  const [kategoriResult, tagResult, jurusanResult] = await Promise.all([
    supabaseClient
      .from("artikel_kategori")
      .select("kategori:kategori_id(nama)")
      .eq("artikel_tipe", type)
      .eq("artikel_id", artikelId),

    supabaseClient
      .from("artikel_tags")
      .select("tag:tag_id(nama)")
      .eq("artikel_tipe", type)
      .eq("artikel_id", artikelId),

    supabaseClient
      .from("artikel_jurusan")
      .select("jurusan:jurusan_id(nama)")
      .eq("artikel_tipe", type)
      .eq("artikel_id", artikelId)
  ]);

  if (kategoriResult.error) {
    console.error("Gagal memuat kategori artikel:", kategoriResult.error);
  }

  if (tagResult.error) {
    console.error("Gagal memuat tag artikel:", tagResult.error);
  }

  if (jurusanResult.error) {
    console.error("Gagal memuat relasi jurusan artikel:", jurusanResult.error);
  }

  return {
    kategori: (kategoriResult.data || []).map(row => row.kategori?.nama).filter(Boolean),
    tags: (tagResult.data || []).map(row => row.tag?.nama).filter(Boolean),
    jurusan: (jurusanResult.data || []).map(row => row.jurusan?.nama).filter(Boolean)
  };
}

function renderPost(data, relations, type) {
  const postDetail = document.getElementById("postDetail");
  if (!postDetail) return;

  let title = "";
  let category = "";
  let content = "";

  if (type === "info" || type === "wiki") {
    title = data.judul;
    category = data.kategori || "Umum";
    content = data.isi || "";
  }

  if (type === "job") {
    title = data.posisi;
    category = `${data.perusahaan || "Perusahaan"} · ${data.lokasi || "Fleksibel"}`;
    content = data.deskripsi || "";
  }

  document.title = `${title || "Artikel"} - SA UPI`;

  postDetail.innerHTML = `
    <article class="post-card">
      ${data.gambar ? `
        <img src="${escapeHTML(data.gambar)}" class="post-image" alt="${escapeHTML(title)}" loading="lazy" decoding="async">
      ` : ""}

      <h1>${escapeHTML(title)}</h1>

      <p class="post-date">
        ${escapeHTML(category)}${data.created_at ? ` · ${formatDate(data.created_at)}` : ""}
      </p>

      <div class="post-meta-group">
        ${renderPills(relations?.kategori || [])}
        ${renderPills(relations?.tags || [], "tag-pill")}
        ${renderPills(relations?.jurusan || [], "jurusan-pill")}
      </div>

      <div class="post-content">
        ${content}
      </div>

      ${
        type === "job" && data.link
          ? `<a href="${escapeHTML(data.link)}" target="_blank" rel="noopener noreferrer" class="btn primary">Buka Link Pendaftaran</a>`
          : ""
      }

      <div class="share-actions">
        <button id="shareWhatsapp" class="btn primary">
          📤 Bagikan ke WhatsApp
        </button>

        <button id="copyLink" class="btn ghost">
          🔗 Salin Link
        </button>
      </div>

      <br><br>
      <a href="../index.html" class="btn ghost">← Kembali ke Beranda</a>
    </article>
  `;

  setupShareButtons();
}

function renderPills(items, className = "") {
  if (!Array.isArray(items) || !items.length) return "";

  return items
    .map(item => `<span class="pill ${className}">${escapeHTML(item)}</span>`)
    .join("");
}

function showPostError(message) {
  const postDetail = document.getElementById("postDetail");
  if (!postDetail) return;

  postDetail.innerHTML = `
    <div class="empty">
      ${escapeHTML(message)}
      <br><br>
      <a href="../index.html" class="btn ghost">Kembali</a>
    </div>
  `;
}

function setupShareButtons() {
  const shareBtn = document.getElementById("shareWhatsapp");
  const copyBtn = document.getElementById("copyLink");

  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(window.location.href)}`,
        "_blank"
      );
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);

        copyBtn.textContent = "✅ Link Tersalin";

        setTimeout(() => {
          copyBtn.textContent = "🔗 Salin Link";
        }, 2000);
      } catch {
        alert("Gagal menyalin link.");
      }
    });
  }
}

loadPost();