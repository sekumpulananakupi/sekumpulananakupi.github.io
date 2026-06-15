const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let jurusanData = [];
let statistikData = [];
let acceptanceMap = new Map();

const FILTER_DEFAULTS = {
  q: "",
  fakultas: "all",
  jenjang: "all",
  akreditasi: "all",
  sort: "az"
};

async function loadJurusan() {
  showLoading("jurusanList", 6);

  const { data, error } = await supabaseClient
    .from("jurusan")
    .select("*")
    .order("nama");

  if (error) {
    console.error("Gagal memuat jurusan:", error);
    document.getElementById("jurusanList").innerHTML = `
      <div class="empty">Gagal memuat data jurusan.</div>
    `;
    setResultInfo("Gagal memuat data jurusan.");
    return;
  }

  jurusanData = data || [];

  await loadStatistikJurusan();
  setupFilterOptions();
  applyFiltersFromURL();
  renderJurusan(false);
}

async function loadStatistikJurusan() {
  const { data, error } = await supabaseClient
    .from("statistik_jurusan")
    .select("jurusan_id, tahun, jalur, daya_tampung, peminat");

  if (error) {
    console.warn("Statistik jurusan tidak bisa dimuat. Sorting daya saing tetap aman, tapi tidak aktif.", error);
    statistikData = [];
    acceptanceMap = new Map();
    return;
  }

  statistikData = data || [];
  acceptanceMap = buildAcceptanceMap(statistikData);
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
      grouped.set(jurusanId, {
        tahun,
        dayaTampung: 0,
        peminat: 0
      });
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

    result.set(jurusanId, {
      ...value,
      percent
    });
  });

  return result;
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
  const uniqueValues = [...new Set(
    rawValues
      .map(normalizeText)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "id"));

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

function getCurrentFilters() {
  return {
    q: normalizeText(document.getElementById("jurusanSearch")?.value).toLowerCase(),
    fakultas: document.getElementById("filterFakultas")?.value || "all",
    jenjang: document.getElementById("filterJenjang")?.value || "all",
    akreditasi: document.getElementById("filterAkreditasi")?.value || "all",
    sort: document.getElementById("sortJurusan")?.value || "az"
  };
}

function renderJurusan(shouldUpdateURL = true) {
  const filters = getCurrentFilters();

  let filtered = jurusanData.filter(item => {
    const nama = normalizeText(item.nama).toLowerCase();
    const fakultas = normalizeText(item.fakultas);
    const jenjang = normalizeText(item.jenjang);
    const akreditasi = normalizeText(item.akreditasi);

    const cocokKeyword = !filters.q || nama.includes(filters.q);
    const cocokFakultas = filters.fakultas === "all" || fakultas === filters.fakultas;
    const cocokJenjang = filters.jenjang === "all" || jenjang === filters.jenjang;
    const cocokAkreditasi = filters.akreditasi === "all" || akreditasi === filters.akreditasi;

    return cocokKeyword && cocokFakultas && cocokJenjang && cocokAkreditasi;
  });

  filtered = sortJurusan(filtered, filters.sort);

  setResultInfo(`Menampilkan ${filtered.length} dari ${jurusanData.length} jurusan.`);

  const list = document.getElementById("jurusanList");
  if (!list) return;

  list.innerHTML = filtered.length
    ? filtered.map(createCard).join("")
    : `<div class="empty">Tidak ada jurusan yang cocok dengan filter.</div>`;

  if (shouldUpdateURL) updateURLFromFilters(filters);
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
  const aStat = acceptanceMap.get(Number(a.id));
  const bStat = acceptanceMap.get(Number(b.id));

  const aValue = typeof aStat?.percent === "number" ? aStat.percent : null;
  const bValue = typeof bStat?.percent === "number" ? bStat.percent : null;

  if (aValue === null && bValue === null) {
    return normalizeText(a.nama).localeCompare(normalizeText(b.nama), "id");
  }

  if (aValue === null) return 1;
  if (bValue === null) return -1;

  return direction === "asc" ? aValue - bValue : bValue - aValue;
}

function setResultInfo(text) {
  const resultInfo = document.getElementById("jurusanResultInfo");
  if (resultInfo) resultInfo.textContent = text;
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

  const query = params.toString();
  const newURL = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;

  window.history.replaceState({}, "", newURL);
}

function formatPercent(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
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

  const stat = acceptanceMap.get(Number(item.id));
  const percentText = formatPercent(stat?.percent);

  return `
    <article class="item-card">
      <div class="card-meta">
        <span class="pill">${escapeHTML(item.fakultas || "UPI")}</span>
        <span class="pill">${escapeHTML(item.jenjang || "S1")}</span>
        ${
          item.akreditasi
            ? `<span class="pill">Akreditasi ${escapeHTML(item.akreditasi)}</span>`
            : ""
        }
      </div>

      <h3>${escapeHTML(item.nama)}</h3>

      <p>${escapeHTML(item.deskripsi || "").slice(0, 120)}${item.deskripsi && item.deskripsi.length > 120 ? "..." : ""}</p>

      <p><strong>Prospek:</strong> ${escapeHTML(prospekSingkat)}</p>

      ${
        percentText
          ? `<p class="acceptance-note"><strong>Estimasi keterimaan:</strong> ${percentText}% berdasarkan statistik tahun ${escapeHTML(stat.tahun)}.</p>`
          : ""
      }

      <a href="jurusan-detail.html?id=${encodeURIComponent(item.id)}" class="btn primary">
        Lihat Detail
      </a>
    </article>
  `;
}

function initJurusanPage() {
  document.getElementById("jurusanSearch")?.addEventListener("input", () => renderJurusan(true));
  document.getElementById("filterFakultas")?.addEventListener("change", () => renderJurusan(true));
  document.getElementById("filterJenjang")?.addEventListener("change", () => renderJurusan(true));
  document.getElementById("filterAkreditasi")?.addEventListener("change", () => renderJurusan(true));
  document.getElementById("sortJurusan")?.addEventListener("change", () => renderJurusan(true));
  document.getElementById("resetFilterJurusan")?.addEventListener("click", resetFilterJurusan);

  loadJurusan();
}

initJurusanPage();
