const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dokumenData = [];
let activeDokumenKategori = "all";

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

async function loadDokumen() {
  const { data, error } = await supabaseClient
    .from("dokumen_kampus")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil dokumen:", error);
    return;
  }

  dokumenData = data || [];

  renderDokumenKategoriFilter();
  renderDokumen();
}

function renderDokumenKategoriFilter() {
  const select = document.getElementById("dokumenKategoriFilter");
  if (!select) return;

  const kategoriList = [...new Set(
    dokumenData
      .map(item => item.kategori)
      .filter(Boolean)
  )];

  select.innerHTML =
    `<option value="all">Semua Kategori</option>` +
    kategoriList
      .map(item => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`)
      .join("");

  select.addEventListener("change", () => {
    activeDokumenKategori = select.value;
    renderDokumen();
  });
}

function renderDokumen() {
  const searchInput = document.getElementById("dokumenSearch");
  const container = document.getElementById("dokumenList");

  if (!container) return;

  const keyword = searchInput
    ? searchInput.value.toLowerCase()
    : "";

  const filtered = dokumenData.filter(item => {
    const matchSearch = JSON.stringify(item)
      .toLowerCase()
      .includes(keyword);

    const matchKategori =
      activeDokumenKategori === "all" ||
      item.kategori === activeDokumenKategori;

    return matchSearch && matchKategori;
  });

  container.innerHTML = filtered.length
    ? filtered.map(createDokumenCard).join("")
    : `<div class="empty">Belum ada dokumen.</div>`;
}

function createDokumenCard(item) {
  return `
    <article class="item-card">
      <span class="pill">${escapeHTML(item.kategori || "Dokumen")}</span>

      <h3>${escapeHTML(item.judul)}</h3>

      <p>${escapeHTML(item.deskripsi || "Tidak ada deskripsi.")}</p>

      <a href="${escapeHTML(item.link)}" target="_blank" class="btn primary">
        Buka Dokumen
      </a>
    </article>
  `;
}

const dokumenSearch = document.getElementById("dokumenSearch");

if (dokumenSearch) {
  dokumenSearch.addEventListener("input", renderDokumen);
}

loadDokumen();
