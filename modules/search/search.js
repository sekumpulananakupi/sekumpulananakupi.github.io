const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SEARCH_CACHE_TTL = 720;
const RECENT_KEY = "saupi_recent_searches_v1";

let searchTimer = null;
let currentFilter = "all";
let latestItems = [];
let latestKeyword = "";

const TYPE_META = {
  info: {
    label: "Info Kampus",
    icon: "fa-regular fa-newspaper",
    action: "Baca info"
  },
  wiki: {
    label: "Wiki Kampus",
    icon: "fa-solid fa-book-open",
    action: "Buka wiki"
  },
  jurusan: {
    label: "Jurusan",
    icon: "fa-solid fa-graduation-cap",
    action: "Lihat jurusan"
  },
  job: {
    label: "Lowongan",
    icon: "fa-solid fa-briefcase",
    action: "Lihat lowongan"
  }
};

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return [...document.querySelectorAll(selector)];
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

function makeSearchItem({ type, label, title, content, image = "", url }) {
  const cleanContent = stripHTML(content || "");
  const meta = TYPE_META[type] || TYPE_META.info;

  return {
    type,
    label: label || meta.label,
    title: title || "-",
    content: cleanContent,
    image,
    url,
    searchText: normalizeSearchText(`${type} ${label || ""} ${title || ""} ${cleanContent}`)
  };
}

function applyKeywordFromURL() {
  const keyword = new URLSearchParams(window.location.search).get("q");
  const input = qs("#globalSearch");

  if (keyword && input) input.value = keyword;
}

function updateSearchURL(keyword) {
  const params = new URLSearchParams();
  if (keyword) params.set("q", keyword);

  const newURL = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  window.history.replaceState({}, "", newURL);
}

function setStatus(text) {
  const status = qs("#searchStatus");
  if (status) status.textContent = text;
}

function setTitle(text) {
  const title = qs("#resultTitle");
  if (title) title.textContent = text;
}

function setClearButtonState() {
  const input = qs("#globalSearch");
  const clear = qs("#clearSearch");
  if (!input || !clear) return;

  clear.classList.toggle("is-visible", Boolean(input.value.trim()));
}

function showSkeleton() {
  const results = qs("#searchResults");
  if (!results) return;

  results.innerHTML = Array.from({ length: 4 }, () => `<div class="skeleton-card"></div>`).join("");
}

function showEmptyStart() {
  const results = qs("#searchResults");
  if (!results) return;

  results.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-magnifying-glass"></i>
      <strong>Mulai dengan mengetik kata kunci.</strong>
      <p>Coba cari UKT, PKKMB, jurusan, beasiswa, atau lowongan kerja.</p>
    </div>
  `;
  setStatus("Ketik kata kunci untuk mulai mencari.");
  setTitle("Pencarian Global");
}

function showEmptyResult(keyword) {
  const results = qs("#searchResults");
  if (!results) return;

  results.innerHTML = `
    <div class="empty-state">
      <i class="fa-regular fa-face-frown-open"></i>
      <strong>Tidak ada hasil untuk “${escapeHTML(keyword)}”.</strong>
      <p>Coba kata yang lebih umum, cek ejaan, atau gunakan nama jurusan/kategori lain.</p>
    </div>
  `;
}

function showErrorState(message = "Terjadi kesalahan saat memuat pencarian.") {
  const results = qs("#searchResults");
  if (!results) return;

  results.innerHTML = `
    <div class="error-state">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <strong>Pencarian belum berhasil.</strong>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

function sanitizeSupabaseKeyword(keyword) {
  return normalizeSearchText(keyword).replace(/[%,()]/g, " ").trim();
}

function scoreItem(item, keyword) {
  const key = normalizeSearchText(keyword);
  const title = normalizeSearchText(item.title);
  const label = normalizeSearchText(item.label);
  const content = normalizeSearchText(item.content);

  let score = 0;
  if (title === key) score += 80;
  if (title.startsWith(key)) score += 55;
  if (title.includes(key)) score += 40;
  if (label.includes(key)) score += 20;
  if (content.includes(key)) score += 12;

  if (item.type === "jurusan") score += 5;
  if (item.type === "wiki") score += 3;

  return score;
}

function highlight(text, keyword) {
  const safeText = escapeHTML(text || "");
  const words = normalizeSearchText(keyword)
    .split(" ")
    .filter(word => word.length >= 2)
    .slice(0, 5);

  if (!words.length) return safeText;

  const pattern = new RegExp(`(${words.map(escapeRegExp).join("|")})`, "gi");
  return safeText.replace(pattern, "<mark>$1</mark>");
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function truncateText(text, limit = 170) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit).trim()}...`;
}

function createResultCard(item, keyword) {
  const meta = TYPE_META[item.type] || TYPE_META.info;

  return `
    <a class="search-result-card" data-type="${escapeHTML(item.type)}" href="${escapeHTML(item.url)}">
      <div class="result-icon"><i class="${escapeHTML(meta.icon)}"></i></div>
      <div class="result-body">
        <div class="result-meta">
          <span class="result-pill">${escapeHTML(item.label)}</span>
          <span class="result-type">${escapeHTML(meta.label)}</span>
        </div>
        <h3>${highlight(item.title, keyword)}</h3>
        <p>${highlight(truncateText(item.content), keyword)}</p>
        <span class="result-action">${escapeHTML(meta.action)} <i class="fa-solid fa-arrow-right"></i></span>
      </div>
    </a>
  `;
}

function renderFilteredResults() {
  const results = qs("#searchResults");
  if (!results) return;

  const filtered = currentFilter === "all"
    ? latestItems
    : latestItems.filter(item => item.type === currentFilter);

  if (!latestKeyword) {
    showEmptyStart();
    return;
  }

  if (!filtered.length) {
    showEmptyResult(latestKeyword);
    setStatus(`Tidak ada hasil pada filter ini.`);
    return;
  }

  results.innerHTML = filtered.map(item => createResultCard(item, latestKeyword)).join("");

  const filterLabel = currentFilter === "all"
    ? "semua kategori"
    : (TYPE_META[currentFilter]?.label || currentFilter).toLowerCase();

  setStatus(`${filtered.length} hasil ditemukan di ${filterLabel}.`);
  setTitle(`Hasil untuk “${latestKeyword}”`);
}

async function fetchSearchItems(keyword) {
  const safeKeyword = sanitizeSupabaseKeyword(keyword);
  if (!safeKeyword) return [];

  const [infoResult, wikiResult, jobsResult, jurusanResult] = await Promise.all([
    supabaseClient
      .from("informasi_kampus")
      .select("id, judul, isi, gambar")
      .or(`judul.ilike.%${safeKeyword}%,isi.ilike.%${safeKeyword}%`)
      .limit(10),

    supabaseClient
      .from("wiki_kampus")
      .select("id, judul, isi, gambar")
      .or(`judul.ilike.%${safeKeyword}%,isi.ilike.%${safeKeyword}%`)
      .limit(10),

    supabaseClient
      .from("lowongan_kerja")
      .select("id, posisi, perusahaan, deskripsi, gambar")
      .or(`posisi.ilike.%${safeKeyword}%,perusahaan.ilike.%${safeKeyword}%,deskripsi.ilike.%${safeKeyword}%`)
      .limit(10),

    supabaseClient
      .from("jurusan")
      .select("id, nama, fakultas, deskripsi, prospek_kerja")
      .or(`nama.ilike.%${safeKeyword}%,fakultas.ilike.%${safeKeyword}%,deskripsi.ilike.%${safeKeyword}%,prospek_kerja.ilike.%${safeKeyword}%`)
      .limit(10)
  ]);

  const errors = [infoResult, wikiResult, jobsResult, jurusanResult]
    .map(result => result.error)
    .filter(Boolean);

  if (errors.length) {
    console.warn("Search errors:", errors);
  }

  const items = [
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

  return items
    .map(item => ({ ...item, score: scoreItem(item, keyword) }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}

async function renderSearchResults() {
  const input = qs("#globalSearch");
  if (!input) return;

  const keyword = normalizeSearchText(input.value);
  latestKeyword = keyword;
  setClearButtonState();

  if (!keyword) {
    latestItems = [];
    updateSearchURL("");
    showEmptyStart();
    renderRecentSearches();
    return;
  }

  showSkeleton();
  setStatus("Mencari data...");
  setTitle("Sedang mencari...");

  try {
    const cacheKey = `global_search_items_${keyword}_v2`;
    const cached = typeof getCache === "function" ? getCache(cacheKey, SEARCH_CACHE_TTL) : null;

    latestItems = cached || await fetchSearchItems(keyword);

    if (!cached && typeof setCache === "function") {
      setCache(cacheKey, latestItems);
    }

    saveRecentSearch(keyword);
    renderRecentSearches();
    updateSearchURL(keyword);
    renderFilteredResults();
  } catch (error) {
    console.error(error);
    showErrorState("Coba refresh halaman atau gunakan kata kunci lain.");
    setStatus("Pencarian gagal dimuat.");
  }
}

function handleSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderSearchResults, 450);
}

function runKeywordSearch(keyword) {
  const input = qs("#globalSearch");
  if (!input) return;

  input.value = keyword;
  input.focus();
  renderSearchResults();
}

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(keyword) {
  if (!keyword || keyword.length < 2) return;

  const recents = getRecentSearches().filter(item => item !== keyword);
  recents.unshift(keyword);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents.slice(0, 6)));
}

function renderRecentSearches() {
  const box = qs("#recentSearch");
  if (!box) return;

  const recents = getRecentSearches();
  if (!recents.length || latestKeyword) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  box.hidden = false;
  box.innerHTML = `
    <span>Pencarian terakhir:</span>
    ${recents.map(item => `<button type="button" data-recent="${escapeHTML(item)}">${escapeHTML(item)}</button>`).join("")}
  `;
}

function setupFilters() {
  qsa(".filter-chips button").forEach(button => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter || "all";

      qsa(".filter-chips button").forEach(item => item.classList.remove("active"));
      button.classList.add("active");

      renderFilteredResults();
    });
  });
}

function setupQuickSearch() {
  qsa("[data-keyword]").forEach(button => {
    button.addEventListener("click", () => runKeywordSearch(button.dataset.keyword || button.textContent));
  });

  document.addEventListener("click", event => {
    const recentButton = event.target.closest("[data-recent]");
    if (recentButton) runKeywordSearch(recentButton.dataset.recent);
  });
}

function setupKeyboardShortcut() {
  document.addEventListener("keydown", event => {
    const isCtrlK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
    const isSlash = event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);

    if (!isCtrlK && !isSlash) return;

    event.preventDefault();
    qs("#globalSearch")?.focus();
  });
}

function setupClearButton() {
  qs("#clearSearch")?.addEventListener("click", () => {
    const input = qs("#globalSearch");
    if (!input) return;

    input.value = "";
    input.focus();
    renderSearchResults();
  });
}

function initSearchPage() {
  const input = qs("#globalSearch");
  if (!input) return;

  applyKeywordFromURL();
  setupFilters();
  setupQuickSearch();
  setupKeyboardShortcut();
  setupClearButton();

  input.addEventListener("input", handleSearchInput);
  setClearButtonState();

  if (input.value.trim()) {
    renderSearchResults();
  } else {
    showEmptyStart();
    renderRecentSearches();
  }
}

document.addEventListener("DOMContentLoaded", initSearchPage);
