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

async function loadPost() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const id = params.get("id");

  const postDetail = document.getElementById("postDetail");

  if (!type || !id) {
    postDetail.innerHTML = `
      <div class="empty">
        Artikel tidak ditemukan.
        <br><br>
        <a href="index.html" class="btn ghost">Kembali</a>
      </div>
    `;
    return;
  }

  let table = "";

  if (type === "info") table = "informasi_kampus";
  if (type === "wiki") table = "wiki_kampus";
  if (type === "job") table = "lowongan_kerja";

  if (!table) {
    postDetail.innerHTML = `<div class="empty">Jenis artikel tidak valid.</div>`;
    return;
  }

  const { data, error } = await supabaseClient
    .from(table)
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    postDetail.innerHTML = `
      <div class="empty">
        Gagal memuat artikel.
        <br><br>
        <a href="index.html" class="btn ghost">Kembali</a>
      </div>
    `;
    return;
  }

  let title = "";
  let category = "";
  let content = "";

  if (type === "info" || type === "wiki") {
    title = data.judul;
    category = data.kategori || "Umum";
    content = data.isi;
  }

  if (type === "job") {
    title = data.posisi;
    category = `${data.perusahaan || "Perusahaan"} · ${data.lokasi || "Fleksibel"}`;
    content = data.deskripsi || "";
  }

  postDetail.innerHTML = `
    <article class="post-card">
      ${data.gambar ? `<img src="${escapeHTML(data.gambar)}" class="post-image" alt="${escapeHTML(title)}">` : ""}

      <span class="pill">${escapeHTML(category)}</span>

      <h1>${escapeHTML(title)}</h1>

      <p class="post-date">${formatDate(data.created_at)}</p>

      <div class="post-content">
        ${escapeHTML(content).replace(/\n/g, "<br>")}
      </div>

      ${
        type === "job" && data.link
          ? `<a href="${escapeHTML(data.link)}" target="_blank" class="btn primary">Buka Link Pendaftaran</a>`
          : ""
      }

      <button class="btn primary" onclick="sharePost()">Bagikan Artikel</button>
      
      <br><br>
      <a href="index.html" class="btn ghost">← Kembali ke Beranda</a>
    </article>
  `;
}

loadPost();
