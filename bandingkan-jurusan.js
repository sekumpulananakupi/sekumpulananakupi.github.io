const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let jurusanData = [];
let statistikData = [];

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

async function loadData() {
  const { data: jurusan } = await supabaseClient
    .from("jurusan")
    .select("*")
    .order("nama", { ascending: true });

  const { data: statistik } = await supabaseClient
    .from("statistik_jurusan")
    .select("*")
    .order("tahun", { ascending: false });

  jurusanData = jurusan || [];
  statistikData = statistik || [];

  fillSelect("jurusanA");
  fillSelect("jurusanB");
}

function fillSelect(id) {
  const select = document.getElementById(id);

  select.innerHTML =
    `<option value="">Pilih Jurusan</option>` +
    jurusanData
      .map(item => `<option value="${item.id}">${escapeHTML(item.nama)}</option>`)
      .join("");
}

function getStatistik(jurusanId) {
  return statistikData.filter(item =>
    String(item.jurusan_id) === String(jurusanId)
  );
}

function renderStatistik(statistik) {
  if (!statistik.length) return `<p>Statistik belum tersedia.</p>`;

  return statistik.slice(0, 3).map(item => {
    const persen = item.peminat > 0
      ? ((item.daya_tampung / item.peminat) * 100).toFixed(2)
      : "0.00";

    return `
      <p>
        <strong>${escapeHTML(item.jalur)} ${item.tahun}</strong><br>
        ${item.daya_tampung} kursi · ${item.peminat} peminat · ${persen}%
      </p>
    `;
  }).join("");
}

function renderListText(text) {
  if (!text) return `<p>-</p>`;

  return `
    <ul>
      ${text
        .split("\n")
        .filter(Boolean)
        .map(item => `<li>${escapeHTML(item)}</li>`)
        .join("")}
    </ul>
  `;
}

function renderCompare() {
  const idA = document.getElementById("jurusanA").value;
  const idB = document.getElementById("jurusanB").value;
  const result = document.getElementById("compareResult");

  if (!idA || !idB) {
    result.innerHTML = `<div class="empty">Pilih dua jurusan untuk dibandingkan.</div>`;
    return;
  }

  if (idA === idB) {
    result.innerHTML = `<div class="empty">Pilih dua jurusan yang berbeda.</div>`;
    return;
  }

  const a = jurusanData.find(item => String(item.id) === String(idA));
  const b = jurusanData.find(item => String(item.id) === String(idB));

  result.innerHTML = `
    <div class="compare-grid">
      ${renderJurusanColumn(a)}
      ${renderJurusanColumn(b)}
    </div>
  `;
}

function renderJurusanColumn(item) {
  const statistik = getStatistik(item.id);

  return `
    <article class="post-card">
      <span class="pill">${escapeHTML(item.fakultas || "UPI")}</span>
      <span class="pill">${escapeHTML(item.jenjang || "S1")}</span>

      <h2>${escapeHTML(item.nama)}</h2>

      <p>${escapeHTML(item.deskripsi || "Deskripsi belum tersedia.")}</p>

      <h3>Akreditasi</h3>
      <p>${escapeHTML(item.akreditasi || "-")}</p>

      <h3>Prospek Kerja</h3>
      ${renderListText(item.prospek_kerja)}

      <h3>Statistik Penerimaan</h3>
      ${renderStatistik(statistik)}

      <a href="jurusan-detail.html?id=${item.id}" class="btn ghost">
        Lihat Detail
      </a>
    </article>
  `;
}

document.getElementById("jurusanA").addEventListener("change", renderCompare);
document.getElementById("jurusanB").addEventListener("change", renderCompare);

loadData();
