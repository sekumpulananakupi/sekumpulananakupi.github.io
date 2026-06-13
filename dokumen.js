const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dokumenData = [];

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
  const { data } = await supabaseClient
    .from("dokumen_kampus")
    .select("*")
    .order("created_at", { ascending: false });

  dokumenData = data || [];
  renderDokumen();
}

function renderDokumen() {
  const keyword = document.getElementById("dokumenSearch").value.toLowerCase();

  const filtered = dokumenData.filter(item =>
    JSON.stringify(item).toLowerCase().includes(keyword)
  );

  document.getElementById("dokumenList").innerHTML = filtered.length
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

document.getElementById("dokumenSearch").addEventListener("input", renderDokumen);

loadDokumen();
