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

async function loadJurusanDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const detail = document.getElementById("jurusanDetail");
  const statistik = await loadStatistikJurusan(id);
  const relatedArticleList = document.getElementById("relatedArticleList");
  const relatedJobList = document.getElementById("relatedJobList");

  if (!id) {
    detail.innerHTML = `<div class="empty">Jurusan tidak ditemukan.</div>`;
    return;
  }

  const { data: jurusan, error } = await supabaseClient
    .from("jurusan")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !jurusan) {
    detail.innerHTML = `<div class="empty">Gagal memuat jurusan.</div>`;
    return;
  }

  detail.innerHTML = `
    <article class="post-card">
      <span class="pill">${escapeHTML(jurusan.fakultas || "UPI")}</span>
      <h1>${escapeHTML(jurusan.nama)}</h1>
      <p class="post-date">${escapeHTML(jurusan.jenjang || "S1")}</p>

      <div class="post-content">
        ${escapeHTML(jurusan.deskripsi || "Deskripsi jurusan belum tersedia.").replace(/\n/g, "<br>")}
      </div>

      <h2>Informasi Program Studi</h2>

      <div class="jurusan-info-grid">
        <div class="stat-card">
          <span>Akreditasi</span>
          <strong>${escapeHTML(jurusan.akreditasi || "-")}</strong>
        </div>
      
        <div class="stat-card">
          <span>Jenjang</span>
          <strong>${escapeHTML(jurusan.jenjang || "-")}</strong>
        </div>
      
        <div class="stat-card">
          <span>Fakultas</span>
          <strong>${escapeHTML(jurusan.fakultas || "-")}</strong>
        </div>
      </div>
      
      ${
        jurusan.website_resmi
          ? `<a href="${escapeHTML(jurusan.website_resmi)}" target="_blank" class="btn ghost">Website Resmi</a>`
          : ""
      }
      
      <h2>Mata Kuliah</h2>
      <ul>
        ${(jurusan.mata_kuliah || "")
          .split("\n")
          .filter(Boolean)
          .map(item => `<li>${escapeHTML(item)}</li>`)
          .join("")}
      </ul>
      
      <h2>Prospek Kerja</h2>
      <ul>
        ${(jurusan.prospek_kerja || "")
          .split("\n")
          .filter(Boolean)
          .map(item => `<li>${escapeHTML(item)}</li>`)
          .join("")}
      </ul>
      
      <h2>Statistik Penerimaan</h2>
      ${renderStatistik(statistik)}

      <a href="jurusan.html" class="btn ghost">← Kembali ke Daftar Jurusan</a>
    </article>
  `;

  await loadRelatedContent(id, relatedArticleList, relatedJobList);
}

async function loadRelatedContent(jurusanId, relatedArticleList, relatedJobList) {
  const { data: relasi } = await supabaseClient
    .from("artikel_jurusan")
    .select("*")
    .eq("jurusan_id", jurusanId);

  if (!relasi || !relasi.length) {
    relatedArticleList.innerHTML = `<div class="empty">Belum ada artikel terkait.</div>`;
    relatedJobList.innerHTML = `<div class="empty">Belum ada lowongan terkait.</div>`;
    return;
  }

  const articles = [];
  const jobs = [];

  for (const row of relasi) {
    let table = "";

    if (row.artikel_tipe === "info") table = "informasi_kampus";
    if (row.artikel_tipe === "wiki") table = "wiki_kampus";
    if (row.artikel_tipe === "job") table = "lowongan_kerja";

    if (!table) continue;

    const { data } = await supabaseClient
      .from(table)
      .select("*")
      .eq("id", row.artikel_id)
      .single();

    if (!data) continue;

    const item = {
      ...data,
      type: row.artikel_tipe
    };

    if (row.artikel_tipe === "job") {
      jobs.push(item);
    } else {
      articles.push(item);
    }
  }

  relatedArticleList.innerHTML = articles.length
    ? articles.map(createRelatedCard).join("")
    : `<div class="empty">Belum ada artikel terkait.</div>`;

  relatedJobList.innerHTML = jobs.length
    ? jobs.map(createRelatedCard).join("")
    : `<div class="empty">Belum ada lowongan terkait.</div>`;
}
function createRelatedCard(item) {
  let title = "";
  let content = "";
  let label = "";

  if (item.type === "info" || item.type === "wiki") {
    title = item.judul;
    content = item.isi;
    label = item.kategori || item.type;
  }

  if (item.type === "job") {
    title = item.posisi;
    content = item.deskripsi;
    label = item.perusahaan || "Lowongan";
  }

  return `
    <article class="item-card">
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(title)}">` : ""}
      <span class="pill">${escapeHTML(label)}</span>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(content).slice(0, 120)}...</p>
      <a href="post.html?type=${item.type}&id=${item.id}" class="btn ghost">Baca Detail</a>
    </article>
  `;
}

async function loadStatistikJurusan(jurusanId) {
  const { data } = await supabaseClient
    .from("statistik_jurusan")
    .select("*")
    .eq("jurusan_id", jurusanId)
    .order("tahun", { ascending: false });

  return data || [];
}

function renderStatistik(statistik) {
  if (!statistik.length) {
    return `<div class="empty">Statistik jurusan belum tersedia.</div>`;
  }

  return `
    <div class="statistik-grid">
      ${statistik.map(item => {
        const persen = item.peminat > 0
          ? ((item.daya_tampung / item.peminat) * 100).toFixed(2)
          : "0.00";

        return `
          <div class="stat-card">
            <span>${escapeHTML(item.jalur)} ${item.tahun}</span>
            <strong>${persen}%</strong>
            <p>${item.daya_tampung} kursi dari ${item.peminat} peminat</p>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

loadJurusanDetail();
