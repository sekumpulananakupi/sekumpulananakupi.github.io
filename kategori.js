const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let contentData = [];

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
    .select("*")
    .eq("id", id)
    .single();

  if (!master) {
    pageTitle.textContent = "Data tidak ditemukan";
    return;
  }

  pageTitle.textContent = master.nama;

  const { data: relasi } = await supabaseClient
    .from(relationTable)
    .select("*")
    .eq(relationColumn, id);

  if (!relasi || !relasi.length) {
    contentList.innerHTML = `<div class="empty">Belum ada konten terkait.</div>`;
    return;
  }

  const items = [];

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

    if (data) {
      items.push({
        ...data,
        type: row.artikel_tipe
      });
    }
  }

  contentData = items;
  renderContent();
}

function renderContent() {
  const keyword = document.getElementById("contentSearch").value.toLowerCase();

  const filtered = contentData.filter(item =>
    JSON.stringify(item).toLowerCase().includes(keyword)
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

      <a href="post.html?type=${item.type}&id=${item.id}" class="btn ghost">
        Baca Detail
      </a>
    </article>
  `;
}

document.getElementById("contentSearch").addEventListener("input", renderContent);

loadPage();
