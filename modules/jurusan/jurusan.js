const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let jurusanData = [];
let statistikData = [];
let acceptanceMap = new Map();
let currentPage = 1;

const ITEMS_PER_PAGE = 12;

const FILTER_DEFAULTS = {
  q: "",
  fakultas: "all",
  jenjang: "all",
  akreditasi: "all",
  sort: "az",
  page: 1
};

async function loadJurusan() {
  showLoading("jurusanList", ITEMS_PER_PAGE);

  const cachedJurusan = getCache("jurusan_list_v2", 1440);
  const cachedStatistik = getCache("statistik_jurusan_list_v2", 1440);

  if (cachedJurusan && cachedStatistik) {
    jurusanData = cachedJurusan;
    statistikData = cachedStatistik;
    acceptanceMap = buildAcceptanceMap(statistikData);

    setupFilterOptions();
    updateHeroSummary();
    applyFiltersFromURL();
    renderJurusan(false);
    return;
  }

  const [jurusanResult, statistikResult] = await Promise.all([
    supabaseClient
      .from("jurusan")
      .select(`
        id,
        nama,
        fakultas,
        jenjang,
        akreditasi,
        deskripsi,
        prospek_kerja
      `)
      .order("nama"),

    supabaseClient
      .from("statistik_jurusan")
      .select("jurusan_id, tahun, jalur, daya_tampung, peminat")
  ]);

  if (jurusanResult.error) {
    console.error("Gagal memuat jurusan:", jurusanResult.error);
    document.getElementById("jurusanList").innerHTML = `<div class="empty">Gagal memuat data jurusan.</div>`;
    setResultInfo("Gagal memuat data jurusan.");
    return;
  }

  jurusanData = jurusanResult.data || [];
  statistikData = statistikResult.data || [];

  if (statistikResult.error) {
    console.warn("Statistik jurusan tidak bisa dimuat.", statistikResult.error);
    statistikData = [];
  }

  acceptanceMap = buildAcceptanceMap(statistikData);
  setCache("jurusan_list_v2", jurusanData);
  setCache("statistik_jurusan_list_v2", statistikData);

  setupFilterOptions();
  updateHeroSummary();
  applyFiltersFromURL();
  renderJurusan(false);
}

function buildAcceptanceMap(rows) {
  const latestYearByJurusan = new Map();

  rows.forEach(row => {
    const jurusanId = Number(row.jurusan_id);
    const tahun = Number(row.tahun);
    if (!jurusanId || !tahun) return;

    const currentLatest = latestYearByJurusan.get(jurusanId);
    if (!currentLatest || tahun > currentLatest) {
      latestYearByJurusan.set(jurusanId, tahun);
    }
  });

  const grouped = new Map();

  rows.forEach(row => {
    const jurusanId = Number(row.jurusan_id);
    const tahun = Number(row.tahun);
    if (!jurusanId || latestYearByJurusan.get(jurusanId) !== tahun) return;

    const dayaTampung = Number(row.daya_tampung) || 0;
    const peminat = Number(row.peminat) || 0;

    if (!grouped.has(jurusanId)) {
      grouped.set(jurusanId, { tahun, dayaTampung: 0, peminat: 0 });
    }

    const item = grouped.get(jurusanId);
    item.dayaTampung += dayaTampung;
    item.peminat += peminat;
  });

  const result = new Map();

  grouped.forEach((value, jurusanId) => {
    const percent = value.peminat > 0
      ? (value.dayaTampung / value.peminat) * 100
      : null;

    result.set(jurusanId, { ...value, percent });
  });

  return result;
}

function showLoading(targetId, count = 6) {
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

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeParam(value) {
  return normalizeText(value) || "all";
}

function setupFilterOptions() {
  fillSelectOptions("filterFakultas", jurusanData.map(item => item.fakultas), "Semua fakultas");
  fillSelectOptions("filterJenjang", jurusanData.map(item => item.jenjang), "Semua jenjang");
  fillSelectOptions("filterAkreditasi", jurusanData.map(item => item.akreditasi), "Semua akreditasi");
}

function fillSelectOptions(selectId, rawValues, defaultLabel) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const currentValue = select.value || "all";
  const uniqueValues = [...new Set(rawValues.map(normalizeText).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "id"));

  select.innerHTML = `
    <option value="all">${escapeHTML(defaultLabel)}</option>
    ${uniqueValues.map(value => `
      <option value="${escapeHTML(value)}">${escapeHTML(value)}</option>
    `).join("")}
  `;

  if (uniqueValues.includes(currentValue)) {
    select.value = currentValue;
  }
}

function updateHeroSummary() {
  const totalJurusan = document.getElementById("totalJurusanHero");
  const totalFakultas = document.getElementById("totalFakultasHero");

  const fakultasCount = new Set(jurusanData.map(item => normalizeText(item.fakultas)).filter(Boolean)).size;

  if (totalJurusan) totalJurusan.textContent = jurusanData.length.toLocaleString("id-ID");
  if (totalFakultas) totalFakultas.textContent = fakultasCount.toLocaleString("id-ID");
}

function getCurrentFilters() {
  return {
    q: normalizeText(document.getElementById("jurusanSearch")?.value).toLowerCase(),
    fakultas: document.getElementById("filterFakultas")?.value || "all",
    jenjang: document.getElementById("filterJenjang")?.value || "all",
    akreditasi: document.getElementById("filterAkreditasi")?.value || "all",
    sort: document.getElementById("sortJurusan")?.value || "az",
    page: currentPage
  };
}

function getFilteredJurusan() {
  const filters = getCurrentFilters();

  const filtered = jurusanData.filter(item => {
    const keywordSource = [item.nama, item.fakultas, item.jenjang, item.akreditasi, item.deskripsi, item.prospek_kerja]
      .map(normalizeText)
      .join(" ")
      .toLowerCase();

    const fakultas = normalizeText(item.fakultas);
    const jenjang = normalizeText(item.jenjang);
    const akreditasi = normalizeText(item.akreditasi);

    const cocokKeyword = !filters.q || keywordSource.includes(filters.q);
    const cocokFakultas = filters.fakultas === "all" || fakultas === filters.fakultas;
    const cocokJenjang = filters.jenjang === "all" || jenjang === filters.jenjang;
    const cocokAkreditasi = filters.akreditasi === "all" || akreditasi === filters.akreditasi;

    return cocokKeyword && cocokFakultas && cocokJenjang && cocokAkreditasi;
  });

  return sortJurusan(filtered, filters.sort);
}

function renderJurusan(shouldUpdateURL = true) {
  const filtered = getFilteredJurusan();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const visibleStart = filtered.length ? startIndex + 1 : 0;
  const visibleEnd = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);

  setResultInfo(
    filtered.length
      ? `Menampilkan ${visibleStart}-${visibleEnd} dari ${filtered.length} hasil. Total data: ${jurusanData.length} jurusan.`
      : `Tidak ada hasil dari total ${jurusanData.length} jurusan.`
  );

  const list = document.getElementById("jurusanList");
  if (!list) return;

  list.innerHTML = visibleItems.length
    ? visibleItems.map(createCard).join("")
    : `<div class="empty">Tidak ada jurusan yang cocok dengan filter. Coba reset atau pakai kata kunci lain.</div>`;

  renderActiveFilterChips();
  renderPagination(filtered.length, totalPages);

  if (shouldUpdateURL) updateURLFromFilters(getCurrentFilters());
}

function sortJurusan(items, sortType) {
  const sorted = [...items];

  if (sortType === "za") {
    return sorted.sort((a, b) => normalizeText(b.nama).localeCompare(normalizeText(a.nama), "id"));
  }

  if (sortType === "ketat") {
    return sorted.sort((a, b) => compareAcceptance(a, b, "asc"));
  }

  if (sortType === "longgar") {
    return sorted.sort((a, b) => compareAcceptance(a, b, "desc"));
  }

  return sorted.sort((a, b) => normalizeText(a.nama).localeCompare(normalizeText(b.nama), "id"));
}

function compareAcceptance(a, b, direction = "asc") {
  const aValue = acceptanceMap.get(Number(a.id))?.percent ?? null;
  const bValue = acceptanceMap.get(Number(b.id))?.percent ?? null;

  if (aValue === null && bValue === null) {
    return normalizeText(a.nama).localeCompare(normalizeText(b.nama), "id");
  }

  if (aValue === null) return 1;
  if (bValue === null) return -1;

  return direction === "asc" ? aValue - bValue : bValue - aValue;
}

function renderPagination(totalItems, totalPages) {
  const pagination = document.getElementById("jurusanPagination");
  if (!pagination) return;

  if (totalItems <= ITEMS_PER_PAGE) {
    pagination.innerHTML = "";
    return;
  }

  const buttons = [];
  buttons.push(createPageButton("Sebelumnya", currentPage - 1, currentPage === 1));

  const pageNumbers = getVisiblePageNumbers(currentPage, totalPages);

  pageNumbers.forEach(page => {
    if (page === "...") {
      buttons.push(`<span class="page-dots">...</span>`);
    } else {
      buttons.push(createPageButton(page, page, false, page === currentPage));
    }
  });

  buttons.push(createPageButton("Berikutnya", currentPage + 1, currentPage === totalPages));
  pagination.innerHTML = buttons.join("");
}

function getVisiblePageNumbers(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);

  return pages;
}

function createPageButton(label, page, disabled = false, active = false) {
  return `
    <button
      type="button"
      class="page-btn ${active ? "active" : ""}"
      data-page="${page}"
      ${disabled ? "disabled" : ""}
    >${label}</button>
  `;
}

function goToPage(page) {
  currentPage = Number(page) || 1;
  renderJurusan(true);

  const section = document.querySelector(".jurusan-section");
  if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setResultInfo(text) {
  const resultInfo = document.getElementById("jurusanResultInfo");
  if (resultInfo) resultInfo.textContent = text;
}

function renderActiveFilterChips() {
  const target = document.getElementById("activeFilterChips");
  if (!target) return;

  const filters = getCurrentFilters();
  const chips = [];

  if (filters.q) chips.push(`Kata kunci: ${filters.q}`);
  if (filters.fakultas !== "all") chips.push(`Fakultas: ${filters.fakultas}`);
  if (filters.jenjang !== "all") chips.push(`Jenjang: ${filters.jenjang}`);
  if (filters.akreditasi !== "all") chips.push(`Akreditasi: ${filters.akreditasi}`);
  if (filters.sort !== "az") chips.push(`Urutan: ${getSortLabel(filters.sort)}`);

  target.innerHTML = chips.map(chip => `<span class="filter-chip">${escapeHTML(chip)}</span>`).join("");
}

function getSortLabel(sort) {
  return {
    za: "Nama Z-A",
    ketat: "Paling ketat",
    longgar: "Paling longgar",
    az: "Nama A-Z"
  }[sort] || "Nama A-Z";
}

function resetFilterJurusan() {
  const search = document.getElementById("jurusanSearch");
  const fakultas = document.getElementById("filterFakultas");
  const jenjang = document.getElementById("filterJenjang");
  const akreditasi = document.getElementById("filterAkreditasi");
  const sort = document.getElementById("sortJurusan");

  if (search) search.value = FILTER_DEFAULTS.q;
  if (fakultas) fakultas.value = FILTER_DEFAULTS.fakultas;
  if (jenjang) jenjang.value = FILTER_DEFAULTS.jenjang;
  if (akreditasi) akreditasi.value = FILTER_DEFAULTS.akreditasi;
  if (sort) sort.value = FILTER_DEFAULTS.sort;

  currentPage = 1;
  localStorage.removeItem("compareFirstJurusan");
  renderJurusan(true);
}

function applyFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);

  const search = document.getElementById("jurusanSearch");
  const fakultas = document.getElementById("filterFakultas");
  const jenjang = document.getElementById("filterJenjang");
  const akreditasi = document.getElementById("filterAkreditasi");
  const sort = document.getElementById("sortJurusan");

  if (search) search.value = params.get("q") || FILTER_DEFAULTS.q;
  setSelectValueIfExists(fakultas, normalizeParam(params.get("fakultas")));
  setSelectValueIfExists(jenjang, normalizeParam(params.get("jenjang")));
  setSelectValueIfExists(akreditasi, normalizeParam(params.get("akreditasi")));
  setSelectValueIfExists(sort, params.get("sort") || FILTER_DEFAULTS.sort);

  currentPage = Math.max(1, Number(params.get("page")) || 1);
}

function setSelectValueIfExists(select, value) {
  if (!select) return;

  const optionExists = [...select.options].some(option => option.value === value);
  select.value = optionExists ? value : "all";
}

function updateURLFromFilters(filters) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.fakultas !== "all") params.set("fakultas", filters.fakultas);
  if (filters.jenjang !== "all") params.set("jenjang", filters.jenjang);
  if (filters.akreditasi !== "all") params.set("akreditasi", filters.akreditasi);
  if (filters.sort !== "az") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  const query = params.toString();
  const newURL = query ? `${window.location.pathname}?${query}` : window.location.pathname;

  window.history.replaceState({}, "", newURL);
}

function formatPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function formatCompactNumber(value) {
  const number = Number(value);
  if (Number.isNaN(number) || number <= 0) return "-";
  return number.toLocaleString("id-ID");
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

function truncateText(text, maxLength = 128) {
  const value = normalizeText(text);
  if (!value) return "Deskripsi jurusan belum tersedia.";
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

function getProspekSingkat(text) {
  const value = normalizeText(text);
  if (!value) return "Prospek kerja belum tersedia.";

  return value
    .split(/\n|,|;/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

function getFacultyIcon(fakultas = "") {
  const value = fakultas.toLowerCase();

  if (value.includes("mipa")) return "⚗️";
  if (value.includes("teknik") || value.includes("fptk")) return "🛠️";
  if (value.includes("ekonomi") || value.includes("fpeb")) return "📈";
  if (value.includes("olahraga") || value.includes("fpok")) return "🏃";
  if (value.includes("seni") || value.includes("fpsd")) return "🎨";
  if (value.includes("bahasa") || value.includes("fpbs")) return "📚";
  if (value.includes("pendidikan") || value.includes("fip")) return "🧑‍🏫";
  if (value.includes("kampus")) return "🏫";
  return "🎓";
}

function getCompetitionInfo(percent) {
  if (typeof percent !== "number" || Number.isNaN(percent)) {
    return { label: "Belum ada data", width: 0, color: "#94a3b8" };
  }

  const width = Math.min(100, Math.max(4, percent));

  if (percent < 10) {
    return { label: "Sangat ketat", width, color: "#ef4444" };
  }

  if (percent < 20) {
    return { label: "Cukup ketat", width, color: "#f59e0b" };
  }

  return { label: "Relatif longgar", width, color: "#16a34a" };
}

function getCompareURL(jurusanId) {
  const currentId = String(jurusanId);
  const savedId = localStorage.getItem("compareFirstJurusan");

  if (savedId && savedId !== currentId) {
    localStorage.removeItem("compareFirstJurusan");
    return `../pages/bandingkan-jurusan.html?jurusan1=${encodeURIComponent(savedId)}&jurusan2=${encodeURIComponent(currentId)}`;
  }

  localStorage.setItem("compareFirstJurusan", currentId);
  return `../pages/bandingkan-jurusan.html?jurusan1=${encodeURIComponent(currentId)}`;
}

function handleCompareClick(event, jurusanId) {
  event.preventDefault();
  window.location.href = getCompareURL(jurusanId);
}

function createCard(item) {
  const stat = acceptanceMap.get(Number(item.id));
  const percentText = formatPercent(stat?.percent);
  const competition = getCompetitionInfo(stat?.percent);
  const fakultas = item.fakultas || "UPI";
  const jenjang = item.jenjang || "S1";
  const akreditasi = item.akreditasi ? `Akreditasi ${item.akreditasi}` : "Akreditasi -";

  return `
    <article class="jurusan-card">
      <div class="jurusan-card-head">
        <div class="jurusan-icon" aria-hidden="true">${getFacultyIcon(fakultas)}</div>
        <div>
          <h3>${escapeHTML(item.nama)}</h3>
          <div class="card-meta">
            <span class="pill">${escapeHTML(fakultas)}</span>
            <span class="pill">${escapeHTML(jenjang)}</span>
            <span class="pill">${escapeHTML(akreditasi)}</span>
          </div>
        </div>
      </div>

      <p class="jurusan-card-desc">${escapeHTML(truncateText(item.deskripsi, 132))}</p>
      <p class="prospek-line"><strong>Prospek:</strong> ${escapeHTML(getProspekSingkat(item.prospek_kerja))}</p>

      <div class="jurusan-stat-row">
        <div class="stat-mini">
          <span>Tampung</span>
          <strong>${formatCompactNumber(stat?.dayaTampung)}</strong>
        </div>
        <div class="stat-mini">
          <span>Peminat</span>
          <strong>${formatCompactNumber(stat?.peminat)}</strong>
        </div>
        <div class="stat-mini">
          <span>Keterimaan</span>
          <strong>${percentText ? `${percentText}%` : "-"}</strong>
        </div>
      </div>

      <div class="competition-meter" title="Data gabungan SNBP dan SNBT${stat?.tahun ? ` tahun ${stat.tahun}` : ""}">
        <div class="competition-top">
          <span>${escapeHTML(competition.label)}</span>
          <span>${stat?.tahun ? `Data ${escapeHTML(stat.tahun)}` : ""}</span>
        </div>
        <div class="meter-track" aria-hidden="true">
          <span class="meter-fill" style="--meter-width:${competition.width}%; --meter-color:${competition.color};"></span>
        </div>
      </div>

      <div class="card-actions">
        <a href="../pages/jurusan-detail.html?id=${encodeURIComponent(item.id)}" class="btn primary">Lihat Detail</a>
        <a
          href="../pages/bandingkan-jurusan.html?jurusan1=${encodeURIComponent(item.id)}"
          class="btn compare-btn"
          onclick="handleCompareClick(event, '${escapeHTML(item.id)}')"
        >Bandingkan</a>
      </div>
    </article>
  `;
}

function handleFilterChange() {
  currentPage = 1;
  renderJurusan(true);
}

function initFilterToggle() {
  const toggle = document.getElementById("toggleFilterJurusan");
  const panel = document.getElementById("jurusanFilterPanel");
  if (!toggle || !panel) return;

  toggle.addEventListener("click", () => {
    const isOpen = panel.classList.toggle("show");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

function initJurusanPage() {
  document.getElementById("jurusanSearch")?.addEventListener("input", handleFilterChange);
  document.getElementById("filterFakultas")?.addEventListener("change", handleFilterChange);
  document.getElementById("filterJenjang")?.addEventListener("change", handleFilterChange);
  document.getElementById("filterAkreditasi")?.addEventListener("change", handleFilterChange);
  document.getElementById("sortJurusan")?.addEventListener("change", handleFilterChange);
  document.getElementById("resetFilterJurusan")?.addEventListener("click", resetFilterJurusan);

  document.getElementById("jurusanPagination")?.addEventListener("click", event => {
    const button = event.target.closest(".page-btn");
    if (!button || button.disabled) return;
    goToPage(button.dataset.page);
  });

  initFilterToggle();
  loadJurusan();
}

initJurusanPage();
