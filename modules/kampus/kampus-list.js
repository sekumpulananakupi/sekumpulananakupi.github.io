const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const PAGE_SIZE = 9;
const DEFAULT_CACHE_TTL = 10 * 60 * 1000;
const WIKI_CACHE_TTL = 30 * 60 * 1000;
const CACHE_VERSION = "v2";

const TYPE_CONFIG = {
  info: {
    table: "informasi_kampus",
    columns: "id, judul, kategori, isi, gambar, created_at",
    cacheTtl: DEFAULT_CACHE_TTL,
    label: "Info Kampus",
    emptyTitle: "Belum ada informasi kampus.",
    emptyMessage: "Coba kata kunci lain atau kembali lagi nanti.",
    action: "Baca Info",
  },
  wiki: {
    table: "wiki_kampus",
    columns: "id, judul, kategori, ringkasan, gambar, created_at",
    fallbackColumns: "id, judul, kategori, isi, gambar, created_at",
    cacheTtl: WIKI_CACHE_TTL,
    label: "Wiki Kampus",
    emptyTitle: "Belum ada wiki kampus.",
    emptyMessage: "Coba topik lain atau kembali lagi nanti.",
    action: "Buka Wiki",
  },
};

let currentPage = 0;
let currentKeyword = "";
let rows = [];
let hasMore = true;
let activeRequestId = 0;
let activeController = null;
const memoryCache = new Map();

function cacheKey(key) {
  return `saupi_kampus_list_${CACHE_VERSION}_${key}`;
}

function getCache(key, ttl, { allowStale = false } = {}) {
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry && (allowStale || Date.now() - memoryEntry.time <= ttl)) {
    return memoryEntry.data;
  }

  try {
    const raw = localStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.time || (!allowStale && Date.now() - parsed.time > ttl)) {
      localStorage.removeItem(cacheKey(key));
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed.data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  const payload = { time: Date.now(), data };
  memoryCache.set(key, payload);
  try {
    localStorage.setItem(cacheKey(key), JSON.stringify(payload));
  } catch {
    // Cache is optional; ignore quota/private-mode failures.
  }
}

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char]));
}

function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

function makeExcerpt(text, limit = 150) {
  const clean = stripHTML(text).replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit).trim()}...`;
}

function debounce(fn, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function normalizeKeyword(value) {
  const keyword = value.replace(/[%_]/g, "").replace(/\s+/g, " ").trim();
  return keyword.length === 1 ? "" : keyword;
}

function createQuery(config, from, to, keyword, columns = config.columns) {
  let query = supabaseClient
    .from(config.table)
    .select(columns)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (keyword) {
    const fields = columns.includes("ringkasan")
      ? `judul.ilike.%${keyword}%,kategori.ilike.%${keyword}%,ringkasan.ilike.%${keyword}%`
      : `judul.ilike.%${keyword}%,kategori.ilike.%${keyword}%,isi.ilike.%${keyword}%`;
    query = query.or(fields);
  }

  return query;
}

function getType() {
  const page = document.querySelector(".kampus-list-page");
  return page?.dataset.contentType === "wiki" ? "wiki" : "info";
}

function showSkeleton() {
  const list = document.getElementById("kampusList");
  if (!list) return;
  list.innerHTML = Array.from({ length: 6 }, () => `<article class="skeleton-card"></article>`).join("");
}

function renderCard(type, item) {
  const config = TYPE_CONFIG[type];
  const fallbackCategory = type === "wiki" ? "Wiki" : "Info";
  const excerptSource = item.ringkasan || item.isi || "";
  return `
    <article class="kampus-card">
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" alt="${escapeHTML(item.judul)}" loading="lazy" decoding="async">` : ""}
      <div class="kampus-card__body">
        <span class="pill">${escapeHTML(item.kategori || config.label || fallbackCategory)}</span>
        <h3>${escapeHTML(item.judul)}</h3>
        <p>${escapeHTML(makeExcerpt(excerptSource))}</p>
        <a class="btn ghost" href="../pages/post.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(item.id)}">
          ${escapeHTML(config.action)} <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>
    </article>
  `;
}

function updateCount() {
  const count = document.getElementById("kampusCount");
  if (!count) return;
  const suffix = currentKeyword ? ` untuk "${currentKeyword}"` : "";
  count.textContent = `${rows.length} ditampilkan${suffix}`;
}

function renderList(type) {
  const list = document.getElementById("kampusList");
  const moreButton = document.getElementById("loadMoreKampus");
  const config = TYPE_CONFIG[type];
  if (!list) return;

  list.innerHTML = rows.length
    ? rows.map((item) => renderCard(type, item)).join("")
    : `
      <div class="empty-state kampus-empty">
        <span class="empty-icon">📭</span>
        <h3>${escapeHTML(config.emptyTitle)}</h3>
        <p>${escapeHTML(config.emptyMessage)}</p>
      </div>
    `;

  if (moreButton) moreButton.hidden = !hasMore;
  updateCount();
}

async function fetchRows(type, { append = false } = {}) {
  const config = TYPE_CONFIG[type];
  const from = currentPage * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const safeKeyword = normalizeKeyword(currentKeyword);
  const key = `${type}_${currentPage}_${safeKeyword}`;
  const cached = getCache(key, config.cacheTtl);
  const requestId = ++activeRequestId;

  if (!append) showSkeleton();

  if (cached) {
    rows = append ? [...rows, ...cached] : cached;
    hasMore = cached.length === PAGE_SIZE;
    renderList(type);
    return;
  }

  if (activeController) activeController.abort();
  activeController = typeof AbortController !== "undefined" ? new AbortController() : null;

  let query = createQuery(config, from, to, safeKeyword);
  if (activeController && query.abortSignal) {
    query = query.abortSignal(activeController.signal);
  }

  let { data, error } = await query;
  if (error && config.fallbackColumns) {
    let fallbackQuery = createQuery(config, from, to, safeKeyword, config.fallbackColumns);
    if (activeController && fallbackQuery.abortSignal) {
      fallbackQuery = fallbackQuery.abortSignal(activeController.signal);
    }
    ({ data, error } = await fallbackQuery);
  }

  if (requestId !== activeRequestId) return;

  if (error) {
    console.error(`Gagal memuat ${type}:`, error);
    const stale = getCache(key, config.cacheTtl, { allowStale: true });
    rows = stale ? (append ? [...rows, ...stale] : stale) : (append ? rows : []);
    hasMore = false;
    renderList(type);
    return;
  }

  setCache(key, data || []);
  rows = append ? [...rows, ...(data || [])] : (data || []);
  hasMore = (data || []).length === PAGE_SIZE;
  renderList(type);
}

function initKampusList() {
  const type = getType();
  const input = document.getElementById("kampusSearch");
  const moreButton = document.getElementById("loadMoreKampus");

  input?.addEventListener("input", debounce(() => {
    currentKeyword = normalizeKeyword(input.value);
    currentPage = 0;
    fetchRows(type);
  }, 500));

  moreButton?.addEventListener("click", () => {
    currentPage += 1;
    fetchRows(type, { append: true });
  });

  fetchRows(type);
}

initKampusList();