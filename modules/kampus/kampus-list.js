const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const PAGE_SIZE = 9;
const CACHE_TTL = 5 * 60 * 1000;

const TYPE_CONFIG = {
  info: {
    table: "informasi_kampus",
    label: "Info Kampus",
    emptyTitle: "Belum ada informasi kampus.",
    emptyMessage: "Coba kata kunci lain atau kembali lagi nanti.",
    action: "Baca Info",
  },
  wiki: {
    table: "wiki_kampus",
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

function cacheKey(key) {
  return `saupi_kampus_list_${key}`;
}

function getCache(key) {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.time || Date.now() - parsed.time > CACHE_TTL) {
      localStorage.removeItem(cacheKey(key));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(cacheKey(key), JSON.stringify({ time: Date.now(), data }));
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
  return `
    <article class="kampus-card">
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" alt="${escapeHTML(item.judul)}" loading="lazy" decoding="async">` : ""}
      <div class="kampus-card__body">
        <span class="pill">${escapeHTML(item.kategori || config.label || fallbackCategory)}</span>
        <h3>${escapeHTML(item.judul)}</h3>
        <p>${escapeHTML(makeExcerpt(item.isi))}</p>
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
  const safeKeyword = currentKeyword.replace(/[%_]/g, "").trim();
  const key = `${type}_${currentPage}_${safeKeyword}`;
  const cached = getCache(key);

  if (!append) showSkeleton();

  if (cached) {
    rows = append ? [...rows, ...cached] : cached;
    hasMore = cached.length === PAGE_SIZE;
    renderList(type);
    return;
  }

  let query = supabaseClient
    .from(config.table)
    .select("id, judul, kategori, isi, gambar, created_at")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (safeKeyword) {
    query = query.or(`judul.ilike.%${safeKeyword}%,kategori.ilike.%${safeKeyword}%,isi.ilike.%${safeKeyword}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`Gagal memuat ${type}:`, error);
    rows = append ? rows : [];
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
    currentKeyword = input.value.trim();
    currentPage = 0;
    fetchRows(type);
  }));

  moreButton?.addEventListener("click", () => {
    currentPage += 1;
    fetchRows(type, { append: true });
  });

  fetchRows(type);
}

initKampusList();