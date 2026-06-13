const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

if (menuToggle && navMenu) {
  menuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("show");
  });
}

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

  const relations = await loadRelations(type, id);

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


      <h1>${escapeHTML(title)}</h1>

      <p class="post-date">${formatDate(data.created_at)}</p>

      <div class="post-meta-group">
        ${renderPills(relations.kategori)}
        ${renderPills(relations.tags, "tag-pill")}
        ${renderPills(relations.jurusan, "jurusan-pill")}
      </div>

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

async function loadRelations(type, artikelId) {
  const { data: kategoriRows } = await supabaseClient
    .from("artikel_kategori")
    .select("kategori:kategori_id(nama)")
    .eq("artikel_tipe", type)
    .eq("artikel_id", artikelId);

  const { data: tagRows } = await supabaseClient
    .from("artikel_tags")
    .select("tag:tag_id(nama)")
    .eq("artikel_tipe", type)
    .eq("artikel_id", artikelId);

  const { data: jurusanRows } = await supabaseClient
    .from("artikel_jurusan")
    .select("jurusan:jurusan_id(nama)")
    .eq("artikel_tipe", type)
    .eq("artikel_id", artikelId);

  return {
    kategori: (kategoriRows || []).map(row => row.kategori?.nama).filter(Boolean),
    tags: (tagRows || []).map(row => row.tag?.nama).filter(Boolean),
    jurusan: (jurusanRows || []).map(row => row.jurusan?.nama).filter(Boolean)
  };
}

function renderPills(items, className = "") {
  if (!items.length) return "";

  return items
    .map(item => `<span class="pill ${className}">${escapeHTML(item)}</span>`)
    .join("");
}

loadPost();

function sharePost() {
  if (navigator.share) {
    navigator.share({
      title: document.title,
      url: window.location.href
    });
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert("Link artikel disalin.");
  }
}
