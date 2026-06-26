const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allData = [];
let searchTimer = null;

function showSimpleLoading(targetId, message = "Memuat data...") {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      ${escapeHTML(message)}
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

function normalizeSearchText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function makeSearchItem({
  type,
  label,
  title,
  content,
  image = "",
  url
}) {
  const cleanContent = stripHTML(content || "");

  return {
    type,
    label,
    title: title || "-",
    content: cleanContent,
    image,
    url,
    searchText: normalizeSearchText(`
      ${type}
      ${label}
      ${title || ""}
      ${cleanContent}
    `)
  };
}

async function loadSearchData() {
  const searchResults = document.getElementById("searchResults");
  const searchInput = document.getElementById("globalSearch");

  if (!searchResults || !searchInput) return;

  applyKeywordFromURL();

  if (searchInput.value.trim()) {
    renderSearchResults();
  } else {
    searchResults.innerHTML = `<div class="empty">Ketik kata kunci untuk mencari.</div>`;
  }
}

function applyKeywordFromURL() {
  const params = new URLSearchParams(window.location.search);
  const keyword = params.get("q");
  const searchInput = document.getElementById("globalSearch");

  if (keyword && searchInput) {
    searchInput.value = keyword;
  }
}

async function renderSearchResults() {
  const searchInput = document.getElementById("globalSearch");
  const results = document.getElementById("searchResults");

  if (!searchInput || !results) return;

  const keyword = normalizeSearchText(searchInput.value);

  if (!keyword) {
    results.innerHTML = `<div class="empty">Ketik kata kunci untuk mencari.</div>`;
    updateSearchURL("");
    return;
  }

  showSimpleLoading("searchResults", "Mencari data...");

  const cacheKey = `global_search_result_${keyword}_v1`;
  const cached = getCache(cacheKey, 720);

  if (cached) {
    results.innerHTML = cached;
    updateSearchURL(keyword);
    return;
  }

  const safeKeyword = keyword.replace(/[%,()]/g, " ").trim();

  const [infoResult, wikiResult, jobsResult, jurusanResult] = await Promise.all([
    supabaseClient
      .from("informasi_kampus")
      .select("id, judul, isi, gambar")
      .or(`judul.ilike.%${safeKeyword}%`)
      .limit(8),

    supabaseClient
      .from("wiki_kampus")
      .select("id, judul, isi, gambar")
      .or(`judul.ilike.%${safeKeyword}%`)
      .limit(8),

    supabaseClient
      .from("lowongan_kerja")
      .select("id, posisi, perusahaan, deskripsi, gambar")
      .or(`posisi.ilike.%${safeKeyword}%,perusahaan.ilike.%${safeKeyword}%`)
      .limit(8),

    supabaseClient
      .from("jurusan")
      .select("id, nama, fakultas, deskripsi, prospek_kerja")
      .or(`nama.ilike.%${safeKeyword}%,fakultas.ilike.%${safeKeyword}%`)
      .limit(8)
  ]);

  const searchItems = [
    ...(infoResult.data || []).map(item => makeSearchItem({
      type: "info",
      label: "Info Kampus",
      title: item.judul,
      content: item.isi,
      image: item.gambar,
      url: `../pages/post.html?type=info&id=${item.id}`
    })),

    ...(wikiResult.data || []).map(item => makeSearchItem({
      type: "wiki",
      label: "Wiki Kampus",
      title: item.judul,
      content: item.isi,
      image: item.gambar,
      url: `../pages/post.html?type=wiki&id=${item.id}`
    })),

    ...(jobsResult.data || []).map(item => makeSearchItem({
      type: "job",
      label: item.perusahaan || "Lowongan",
      title: item.posisi,
      content: item.deskripsi,
      image: item.gambar,
      url: `../pages/post.html?type=job&id=${item.id}`
    })),

    ...(jurusanResult.data || []).map(item => makeSearchItem({
      type: "jurusan",
      label: item.fakultas || "Jurusan",
      title: item.nama,
      content: `${item.deskripsi || ""} ${item.prospek_kerja || ""}`,
      image: "",
      url: `../pages/jurusan-detail.html?id=${item.id}`
    }))
  ];

  results.innerHTML = searchItems.length
    ? searchItems.map(createResultCard).join("")
    : `<div class="empty">Tidak ada hasil ditemukan.</div>`;

  setCache(cacheKey, results.innerHTML);
  updateSearchURL(keyword);
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

function updateSearchURL(keyword) {
  const params = new URLSearchParams();

  if (keyword) {
    params.set("q", keyword);
  }

  const query = params.toString();
  const newURL = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;

  window.history.replaceState({}, "", newURL);
}

function handleSearchInput() {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    renderSearchResults();
  }, 500);
}

document.getElementById("globalSearch")?.addEventListener("input", handleSearchInput);

loadSearchData();