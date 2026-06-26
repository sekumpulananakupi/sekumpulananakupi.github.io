const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allData = [];

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

function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

async function loadSearchData() {
  showSimpleLoading("searchResults", "Menyiapkan data pencarian...");
  const { data: info } = await supabaseClient
    .from("informasi_kampus")
    .select("*");

  const { data: wiki } = await supabaseClient
    .from("wiki_kampus")
    .select("*");

  const { data: jobs } = await supabaseClient
    .from("lowongan_kerja")
    .select("*");

  const { data: jurusan } = await supabaseClient
    .from("jurusan")
    .select("*");

  allData = [
    ...(info || []).map(item => ({
      type: "info",
      label: "Info Kampus",
      title: item.judul,
      content: stripHTML(item.isi),
      image: item.gambar,
      url: `post.html?type=info&id=${item.id}`
    })),

    ...(wiki || []).map(item => ({
      type: "wiki",
      label: "Wiki Kampus",
      title: item.judul,
      content: stripHTML(item.isi),
      image: item.gambar,
      url: `post.html?type=wiki&id=${item.id}`
    })),

    ...(jobs || []).map(item => ({
      type: "job",
      label: "Lowongan",
      title: item.posisi,
      content: stripHTML(item.deskripsi),
      image: item.gambar,
      url: `post.html?type=job&id=${item.id}`
    })),

    ...(jurusan || []).map(item => ({
      type: "jurusan",
      label: item.fakultas || "Jurusan",
      title: item.nama,
      content: `${item.deskripsi || ""} ${item.prospek_kerja || ""}`,
      image: "",
      url: `jurusan-detail.html?id=${item.id}`
    }))
  ];
  
  const params = new URLSearchParams(window.location.search);
  const keyword = params.get("q");

  if (keyword) {
    document.getElementById("globalSearch").value = keyword;
  }
  
  renderSearchResults();
}

function renderSearchResults() {
  const keyword = document.getElementById("globalSearch").value.toLowerCase();
  const results = document.getElementById("searchResults");

  if (!keyword) {
    results.innerHTML = `<div class="empty">Ketik kata kunci untuk mencari.</div>`;
    return;
  }

  const filtered = allData.filter(item =>
    JSON.stringify(item).toLowerCase().includes(keyword)
  );

  results.innerHTML = filtered.length
    ? filtered.map(createResultCard).join("")
    : `<div class="empty">Tidak ada hasil ditemukan.</div>`;
}

function createResultCard(item) {
  return `
    <article class="item-card">
      ${item.image ? `<img src="${escapeHTML(item.image)}" class="card-image" alt="${escapeHTML(item.title)}">` : ""}

      <span class="pill">${escapeHTML(item.label)}</span>

      <h3>${escapeHTML(item.title)}</h3>

      <p>${escapeHTML(item.content || "").slice(0, 150)}...</p>

      <a href="${escapeHTML(item.url)}" class="btn ghost">Buka</a>
    </article>
  `;
}

document.getElementById("globalSearch").addEventListener("input", renderSearchResults);

loadSearchData();
