const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PAGE_SIZE = 6;
const FILTER_CACHE_KEY = "saupi_lowongan_filters_v3";
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

function formatDate(dateValue) {
  if (!dateValue) return "Baru diperbarui";

  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(dateValue));
  } catch {
    return "Baru diperbarui";
  }
}

function getInitial(text) {
  return String(text || "SA").trim().slice(0, 1).toUpperCase();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateStats() {
  setText("statTotalJobs", totalMatchedJobs ? totalMatchedJobs.toLocaleString("id-ID") : "0");
  setText("statLoadedJobs", totalLoadedJobs ? totalLoadedJobs.toLocaleString("id-ID") : "0");
  setText("statJurusanJobs", jurusanData.filter(item => (jurusanCounts[item.id] || 0) > 0).length.toLocaleString("id-ID"));
  setText("statTagJobs", tagData.length.toLocaleString("id-ID"));
}

function showLoading(targetId, count = 4) {
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

function showEmpty(targetId, title = "Lowongan tidak ditemukan", message = "Coba gunakan kata kunci, tag, atau jurusan lain.", icon = "fa-briefcase") {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon"><i class="fa-solid ${escapeHTML(icon)}" aria-hidden="true"></i></div>
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
    // localStorage bisa gagal di mode private, jadi aman diabaikan.
  }
}

async function loadFilters() {
  const cached = getCachedFilters();

  if (cached) {
    jurusanData = cached.jurusanData || [];
    tagData = cached.tagData || [];
    jurusanCounts = cached.jurusanCounts || {};
    renderFilters();
    updateStats();
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
  updateStats();
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

    jurusanFilter.innerHTML = `<option value="all">Semua Jurusan</option>` + jurusanOptions;
    jurusanFilter.value = activeJurusan;
  }

  if (tagFilter) {
    tagFilter.innerHTML =
      `<option value="all">Semua Tag</option>` +
      tagData.map(item => `<option value="${item.id}">${escapeHTML(item.nama)}</option>`).join("");

    tagFilter.value = activeTag;
  }
}

function createJobCard(item) {
  const description = stripHTML(item.deskripsi_ringkas || item.deskripsi || "");
  const safeDescription = description.length > 150 ? `${description.slice(0, 150)}...` : description;
  const company = item.perusahaan || "Lowongan SA UPI";
  const location = item.lokasi || "Fleksibel";

  return `
    <article class="job-card">
      <div class="job-card__top">
        <div class="job-card__logo" aria-hidden="true">
          ${item.gambar
            ? `<img src="${escapeHTML(item.gambar)}" alt="${escapeHTML(company)}" loading="lazy">`
            : escapeHTML(getInitial(company))}
        </div>

        <div>
          <h3>${escapeHTML(item.posisi || "Lowongan Kerja")}</h3>
          <div class="job-card__company">
            <span><i class="fa-solid fa-building"></i> ${escapeHTML(company)}</span>
          </div>
        </div>
      </div>

      <div class="job-card__meta">
        <span class="job-pill"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(location)}</span>
        <span class="job-pill"><i class="fa-solid fa-briefcase"></i> Karier</span>
        <span class="job-pill"><i class="fa-solid fa-clock"></i> Terbaru</span>
      </div>

      <p class="job-card__desc">${escapeHTML(safeDescription || "Buka detail lowongan untuk melihat informasi lengkap, persyaratan, dan cara melamar.")}</p>

      <div class="job-card__footer">
        <span class="job-date">Update ${escapeHTML(formatDate(item.created_at))}</span>
        <a href="../pages/post.html?type=job&id=${encodeURIComponent(item.id)}" class="btn ghost">
          Lihat Detail <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>
    </article>
  `;
}

function updateJobCount() {
  const el = document.getElementById("jobCount");
  if (!el) return;

  el.textContent = totalMatchedJobs
    ? `Menampilkan ${totalLoadedJobs} dari ${totalMatchedJobs} lowongan`
    : "Belum ada hasil";
}

function updateFilterSummary() {
  const summary = document.getElementById("jobFilterSummary");
  if (!summary) return;

  const jurusanLabel = document.querySelector(`#jurusanFilter option[value="${CSS.escape(activeJurusan)}"]`)?.textContent?.replace(/ \(\d+\)$/, "");
  const tagLabel = document.querySelector(`#tagFilter option[value="${CSS.escape(activeTag)}"]`)?.textContent;
  const filters = [
    activeKeyword && `kata kunci “${activeKeyword}”`,
    activeJurusan !== "all" && `jurusan ${jurusanLabel || "dipilih"}`,
    activeTag !== "all" && `tag ${tagLabel || "dipilih"}`
  ].filter(Boolean);

  summary.textContent = `Filter aktif: ${filters.length ? filters.join(", ") : "Semua lowongan"}`;
}

function getLoadMoreButton() {
  return document.getElementById("loadMoreJobs");
}

function updateLoadMoreButton() {
  const button = getLoadMoreButton();
  if (!button) return;

  button.classList.toggle("is-hidden", !hasMoreJobs);
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
  updateFilterSummary();
  updateLoadMoreButton();

  if (reset) {
    currentPage = 0;
    hasMoreJobs = true;
    totalLoadedJobs = 0;
    totalMatchedJobs = 0;
    showLoading("jobList", PAGE_SIZE);
    updateJobCount();
    updateStats();
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
    totalMatchedJobs = 0;
    updateLoadMoreButton();
    updateJobCount();
    updateStats();
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
    const safeKeyword = activeKeyword.replaceAll(",", " ").trim();
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
      showEmpty("jobList", "Gagal memuat lowongan", "Coba refresh halaman atau periksa koneksi.", "fa-triangle-exclamation");
    }
    hasMoreJobs = false;
    isLoadingJobs = false;
    updateLoadMoreButton();
    updateJobCount();
    updateStats();
    return;
  }

  const jobs = data || [];

  if (reset) jobList.innerHTML = "";

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
  updateStats();
}

function setActiveQuickChip(keyword) {
  document.querySelectorAll(".quick-chip").forEach(button => {
    button.classList.toggle("is-active", button.dataset.keyword === keyword);
  });
}

function resetFilters() {
  const searchInput = document.getElementById("jobSearch");
  const jurusanFilter = document.getElementById("jurusanFilter");
  const tagFilter = document.getElementById("tagFilter");

  activeKeyword = "";
  activeJurusan = "all";
  activeTag = "all";

  if (searchInput) searchInput.value = "";
  if (jurusanFilter) jurusanFilter.value = "all";
  if (tagFilter) tagFilter.value = "all";

  setActiveQuickChip("");
  loadJobs(true);
}

function initEvents() {
  const searchInput = document.getElementById("jobSearch");
  const jurusanFilter = document.getElementById("jurusanFilter");
  const tagFilter = document.getElementById("tagFilter");
  const loadMoreButton = getLoadMoreButton();
  const resetButton = document.getElementById("resetJobFilters");

  const params = new URLSearchParams(window.location.search);
  const keywordFromUrl = params.get("q");

  if (searchInput && keywordFromUrl) {
    searchInput.value = keywordFromUrl;
    activeKeyword = keywordFromUrl.trim().toLowerCase();
    setActiveQuickChip(activeKeyword);
  }

  if (searchInput) {
    searchInput.addEventListener("input", debounce(event => {
      activeKeyword = event.target.value.trim().toLowerCase();
      setActiveQuickChip(activeKeyword);
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

  if (loadMoreButton) {
    loadMoreButton.addEventListener("click", () => loadJobs(false));
  }

  if (resetButton) {
    resetButton.addEventListener("click", resetFilters);
  }

  document.querySelectorAll(".quick-chip").forEach(button => {
    button.addEventListener("click", () => {
      const keyword = button.dataset.keyword || "";
      activeKeyword = keyword;
      if (searchInput) searchInput.value = keyword;
      setActiveQuickChip(keyword);
      loadJobs(true);
    });
  });
}

async function initLowonganPage() {
  initEvents();
  await loadFilters();
  await loadJobs(true);
}

initLowonganPage();
