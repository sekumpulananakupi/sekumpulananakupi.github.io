const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let jurusanData = [];

async function loadJurusan() {

  const { data } = await supabaseClient
    .from("jurusan")
    .select("*")
    .order("nama");

  jurusanData = data || [];

  renderJurusan();
}

function renderJurusan() {

  const keyword =
    document
      .getElementById("jurusanSearch")
      .value
      .toLowerCase();

  const filtered = jurusanData.filter(item =>
    item.nama.toLowerCase().includes(keyword)
  );

  document.getElementById("jurusanList").innerHTML =
    filtered.length
      ? filtered.map(createCard).join("")
      : `<div class="empty">Tidak ada jurusan.</div>`;
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

function createCard(item) {
  const prospekSingkat = item.prospek_kerja
    ? item.prospek_kerja.split("\n").slice(0, 3).join(", ")
    : "Prospek kerja belum tersedia.";

  return `
    <article class="item-card">
      <span class="pill">${escapeHTML(item.fakultas || "UPI")}</span>
      <span class="pill">${escapeHTML(item.jenjang || "S1")}</span>

      ${
        item.akreditasi
          ? `<span class="pill">Akreditasi ${escapeHTML(item.akreditasi)}</span>`
          : ""
      }

      <h3>${escapeHTML(item.nama)}</h3>

      <p>${escapeHTML(item.deskripsi || "").slice(0, 120)}...</p>

      <p><strong>Prospek:</strong> ${escapeHTML(prospekSingkat)}</p>

      <a href="jurusan-detail.html?id=${item.id}" class="btn primary">
        Lihat Detail
      </a>
    </article>
  `;
}

document
  .getElementById("jurusanSearch")
  .addEventListener("input", renderJurusan);

loadJurusan();
