const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PAGE_SIZE = 5;
const FILTER_CACHE_KEY = "saupi_lowongan_filters_v2";
const FILTER_CACHE_TTL = 5 * 60 * 1000;

let currentPage = 0;
let isLoadingJobs = false;
let hasMoreJobs = true;
let totalLoadedJobs = 0;
let totalMatchedJobs = 0;

let activeJurusan = "all";
let activeTag = "all";
let activeKeyword = "";

let jurusanData = [];
let tagData = [];
let jurusanCounts = {};

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
  return (div.textContent || div.innerText || "").trim();
}

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

function showEmpty(targetId, title = "Lowongan tidak ditemukan", message = "Coba gunakan kata kunci, tag, atau jurusan lain.", icon = "💼") {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

function debounce(fn, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function getCachedFilters() {
  try {
    const raw = localStorage.getItem(FILTER_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed.savedAt || Date.now() - parsed.savedAt > FILTER_CACHE_TTL) {
      localStorage.removeItem(FILTER_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function setCachedFilters() {
  try {
    localStorage.setItem(FILTER_CACHE_KEY, JSON.stringify({
      savedAt: Date.now(),
      jurusanData,
      tagData,
      jurusanCounts
    }));
  } catch {
    // localStorage bisa gagal di mode private, abaikan saja.
  }
}

async function loadFilters() {
  const cached = getCachedFilters();

  if (cached) {
    jurusanData = cached.jurusanData || [];
    tagData = cached.tagData || [];
    renderFilters();
    return;
  }

  const [jurusanResult, tagsResult, relasiJurusanResult] = await Promise.all([
    supabaseClient.from("jurusan").select("id,nama").order("nama", { ascending: true }),
    supabaseClient.from("tags").select("id,nama").order("nama", { ascending: true }),
    supabaseClient.from("artikel_jurusan").select("jurusan_id").eq("artikel_tipe", "job")
  ]);

  jurusanCounts = {};
  (relasiJurusanResult.data || []).forEach(row => {
    jurusanCounts[row.jurusan_id] = (jurusanCounts[row.jurusan_id] || 0) + 1;
  });

  jurusanData = jurusanResult.data || [];
  tagData = tagsResult.data || [];

  setCachedFilters();
  renderFilters();
} // WAJIB ADA: nutup loadFilters di sini

function renderFilters() {
  const jurusanFilter = document.getElementById("jurusanFilter");
  const tagFilter = document.getElementById("tagFilter");

  if (jurusanFilter) {
    jurusanFilter.innerHTML =
      `<option value="all">Semua Jurusan</option>` +
      jurusanData
        .filter(item => (jurusanCounts[item.id] || 0) > 0)
        .map(item => {
          const count = jurusanCounts[item.id] || 0;
          return `<option value="${item.id}">${escapeHTML(item.nama)} (${count})</option>`;
        })
        .join("");

    jurusanFilter.value = activeJurusan;
  }

  if (tagFilter) {
    tagFilter.innerHTML =
      `<option value="all">Semua Tag</option>` +
      tagData
        .map(item => `<option value="${item.id}">${escapeHTML(item.nama)}</option>`)
        .join("");

    tagFilter.value = activeTag;
  }
}

function renderFilters() {
  const jurusanFilter = document.getElementById("jurusanFilter");
  const tagFilter = document.getElementById("tagFilter");

  if (jurusanFilter) {
    const jurusanOptions = jurusanData
      .filter(item => (jurusanCounts[item.id] || 0) > 0)
      .map(item => {
        const count = jurusanCounts[item.id] || 0;
        return `<option value="${item.id}">${escapeHTML(item.nama)} (${count})</option>`;
      })
      .join("");

    jurusanFilter.innerHTML =
      `<option value="all">Semua Jurusan</option>` + jurusanOptions;

    jurusanFilter.value = activeJurusan;
  }

  if (tagFilter) {
    tagFilter.innerHTML =
      `<option value="all">Semua Tag</option>` +
      tagData
        .map(item => `<option value="${item.id}">${escapeHTML(item.nama)}</option>`)
        .join("");

    tagFilter.value = activeTag;
  }
}

function createJobCard(item) {
  return `
    <article class="item-card">
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.posisi)}" loading="lazy">` : ""}

      <span class="pill">${escapeHTML(item.perusahaan || "Lowongan")}</span>
      <span class="pill">${escapeHTML(item.lokasi || "Fleksibel")}</span>

      <h3>${escapeHTML(item.posisi)}</h3>
      <p>${escapeHTML(stripHTML(item.deskripsi_ringkas || item.deskripsi || "")).slice(0, 140)}...</p>

      <a href="../pages/post.html?type=job&id=${item.id}" class="btn ghost">Lihat Detail</a>
    </article>
  `;
}

function updateJobCount() {
  const el = document.getElementById("jobCount");
  if (!el) return;

  if (!totalMatchedJobs) {
    el.textContent = "";
    return;
  }

  el.textContent = `Menampilkan ${totalLoadedJobs} dari ${totalMatchedJobs} lowongan`;
}

function getLoadMoreButton() {
  return document.getElementById("loadMoreJobs");
}

function updateLoadMoreButton() {
  const button = getLoadMoreButton();
  if (!button) return;

  button.style.display = hasMoreJobs ? "inline-flex" : "none";
  button.disabled = isLoadingJobs;
  button.textContent = isLoadingJobs ? "Memuat..." : "Muat Lagi";
}

async function getRelatedJobIds(tableName, columnName, value) {
  const { data, error } = await supabaseClient
    .from(tableName)
    .select("artikel_id")
    .eq("artikel_tipe", "job")
    .eq(columnName, value);

  if (error) {
    console.error(`Gagal mengambil relasi dari ${tableName}:`, error);
    return [];
  }

  return (data || []).map(row => row.artikel_id);
}

async function loadJobs(reset = false) {
  if (isLoadingJobs) return;

  const jobList = document.getElementById("jobList");
  if (!jobList) return;

  isLoadingJobs = true;
  updateLoadMoreButton();

  if (reset) {
    currentPage = 0;
    hasMoreJobs = true;
    totalLoadedJobs = 0;
    totalMatchedJobs = 0;
    showLoading("jobList", PAGE_SIZE);
    updateJobCount();
  }

  let allowedIds = null;

  if (activeJurusan !== "all") {
    allowedIds = await getRelatedJobIds("artikel_jurusan", "jurusan_id", activeJurusan);
  }

  if (activeTag !== "all") {
    const tagIds = await getRelatedJobIds("artikel_tags", "tag_id", activeTag);
    allowedIds = allowedIds === null
      ? tagIds
      : allowedIds.filter(id => tagIds.includes(id));
  }

  if (allowedIds !== null && !allowedIds.length) {
    if (reset) showEmpty("jobList");
    hasMoreJobs = false;
    isLoadingJobs = false;
    updateLoadMoreButton();
    updateJobCount();
    return;
  }

  const from = currentPage * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabaseClient
    .from("lowongan_kerja")
    .select("id,posisi,perusahaan,lokasi,gambar,deskripsi,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (activeKeyword) {
    const safeKeyword = activeKeyword.replaceAll(",", " ");
    query = query.or(
      `posisi.ilike.%${safeKeyword}%,perusahaan.ilike.%${safeKeyword}%,lokasi.ilike.%${safeKeyword}%,deskripsi.ilike.%${safeKeyword}%`
    );
  }

  if (allowedIds !== null) {
    query = query.in("id", allowedIds);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Gagal mengambil lowongan:", error);
    if (reset) {
      showEmpty("jobList", "Gagal memuat lowongan", "Coba refresh halaman atau periksa koneksi.", "⚠️");
    }
    hasMoreJobs = false;
    isLoadingJobs = false;
    updateLoadMoreButton();
    updateJobCount();
    return;
  }

  const jobs = data || [];

  if (reset) {
    jobList.innerHTML = "";
  }

  if (!jobs.length && reset) {
    showEmpty("jobList");
  } else if (jobs.length) {
    jobList.insertAdjacentHTML("beforeend", jobs.map(createJobCard).join(""));
  }

  totalMatchedJobs = count || 0;
  totalLoadedJobs += jobs.length;
  hasMoreJobs = totalLoadedJobs < totalMatchedJobs;
  currentPage += 1;

  isLoadingJobs = false;
  updateLoadMoreButton();
  updateJobCount();
}

function initEvents() {
  const searchInput = document.getElementById("jobSearch");
  const jurusanFilter = document.getElementById("jurusanFilter");
  const tagFilter = document.getElementById("tagFilter");

  const params = new URLSearchParams(window.location.search);
  const keywordFromUrl = params.get("q");

  if (searchInput && keywordFromUrl) {
    searchInput.value = keywordFromUrl;
    activeKeyword = keywordFromUrl.trim().toLowerCase();
  }

  if (searchInput) {
    searchInput.addEventListener("input", debounce(event => {
      activeKeyword = event.target.value.trim().toLowerCase();
      loadJobs(true);
    }));
  }

  if (jurusanFilter) {
    jurusanFilter.addEventListener("change", event => {
      activeJurusan = event.target.value;
      loadJobs(true);
    });
  }

  if (tagFilter) {
    tagFilter.addEventListener("change", event => {
      activeTag = event.target.value;
      loadJobs(true);
    });
  }
}

async function initLowonganPage() {
  initEvents();
  await loadFilters();
  await loadJobs(true);
}

initLowonganPage();