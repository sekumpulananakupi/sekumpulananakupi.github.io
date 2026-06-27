const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let contentData = [];

function prepareSearch() {
  contentData = contentData.map(item => ({
    ...item,
    searchText: `
      ${item.judul || ""}
      ${item.posisi || ""}
      ${item.isi || ""}
      ${item.deskripsi || ""}
      ${item.kategori || ""}
      ${item.perusahaan || ""}
    `.toLowerCase()
  }));
}

function showLoading(targetId, count = 3) {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = Array.from({ length: count }).map(() => `
    <article class="skeleton-card">
      <div class="skeleton-line title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </article>
  `).join("");
}

function showSimpleLoading(targetId, message = "Memuat data...") {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      ${message}
    </div>
  `;
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

async function loadPage() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const id = params.get("id");

  const pageType = document.getElementById("pageType");
  const pageTitle = document.getElementById("pageTitle");
  const contentList = document.getElementById("contentList");

  if (!type || !id) {
    pageTitle.textContent = "Halaman tidak ditemukan";
    contentList.innerHTML = `<div class="empty">Parameter tidak lengkap.</div>`;
    return;
  }

  let masterTable = "";
  let relationTable = "";
  let relationColumn = "";

  if (type === "kategori") {
    masterTable = "kategori";
    relationTable = "artikel_kategori";
    relationColumn = "kategori_id";
    pageType.textContent = "Kategori";
  }

  if (type === "tag") {
    masterTable = "tags";
    relationTable = "artikel_tags";
    relationColumn = "tag_id";
    pageType.textContent = "Tag";
  }

  if (!masterTable) {
    pageTitle.textContent = "Jenis halaman tidak valid";
    return;
  }

  const { data: master } = await supabaseClient
    .from(masterTable)
    .select("id,nama")
    .eq("id", id)
    .single();

  if (!master) {
    pageTitle.textContent = "Data tidak ditemukan";
    return;
  }

  pageTitle.textContent = master.nama;

  const { data: relasi } = await supabaseClient
    .from(relationTable)
.select("artikel_id,artikel_tipe")
    .eq(relationColumn, id);

  if (!relasi || !relasi.length) {
    contentList.innerHTML = `<div class="empty">Belum ada konten terkait.</div>`;
    return;
  }

  const infoIds = relasi
  .filter(r => r.artikel_tipe === "info")
  .map(r => r.artikel_id);

const wikiIds = relasi
  .filter(r => r.artikel_tipe === "wiki")
  .map(r => r.artikel_id);

const jobIds = relasi
  .filter(r => r.artikel_tipe === "job")
  .map(r => r.artikel_id);

const [
  infoResult,
  wikiResult,
  jobResult
] = await Promise.all([

  infoIds.length
    ? supabaseClient
        .from("informasi_kampus")
        .select("id,judul,isi,gambar,kategori")
        .in("id", infoIds)
    : Promise.resolve({ data: [] }),

  wikiIds.length
    ? supabaseClient
        .from("wiki_kampus")
        .select("id,judul,isi,gambar,kategori")
        .in("id", wikiIds)
    : Promise.resolve({ data: [] }),

  jobIds.length
    ? supabaseClient
        .from("lowongan_kerja")
        .select("id,posisi,perusahaan,deskripsi,gambar")
        .in("id", jobIds)
    : Promise.resolve({ data: [] })

]);

contentData = [

  ...(infoResult.data || []).map(i => ({
    ...i,
    type: "info"
  })),

  ...(wikiResult.data || []).map(i => ({
    ...i,
    type: "wiki"
  })),

  ...(jobResult.data || []).map(i => ({
    ...i,
    type: "job"
  }))

];

prepareSearch();

  contentData = items;
  renderContent();
}

function renderContent() {
  const keyword = document.getElementById("contentSearch").value.toLowerCase();

  const filtered = contentData.filter(item =>
    item.searchText.toLowerCase().includes(keyword)
  );

  document.getElementById("contentList").innerHTML = filtered.length
    ? filtered.map(createContentCard).join("")
    : `<div class="empty">Tidak ada konten yang sesuai.</div>`;
}

function createContentCard(item) {
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

      <p>${escapeHTML(content || "").slice(0, 140)}...</p>

      <a href="../pages/post.html?type=${item.type}&id=${item.id}" class="btn ghost">
        Baca Detail
      </a>
    </article>
  `;
}

document.getElementById("contentSearch").addEventListener("input", renderContent);

loadPage();
