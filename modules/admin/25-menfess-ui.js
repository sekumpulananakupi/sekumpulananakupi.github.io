/* =========================
   MENFESS ANALYZER UI
   Rendering, filters, dashboard, workflow actions.
========================= */

const menfessAnalyzerFilters = {
  search: "",
  category: "",
  intent: "",
  status: "",
  recommendation: ""
};

let menfessAnalyzerInitialized = false;

function escapeMenfessHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMenfessDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function populateMenfessSelect(id, items, placeholder) {
  const select = qs(id);
  if (!select) return;

  select.innerHTML = [
    `<option value="">${placeholder}</option>`,
    ...items.map(item => `<option value="${escapeMenfessHTML(item)}">${escapeMenfessHTML(item)}</option>`)
  ].join("");
}

function getFilteredMenfessRecords() {
  const search = menfessAnalyzerFilters.search.toLowerCase();

  return (menfessAnalyzerData || []).filter(record => {
    const haystack = [
      record.rawContent,
      record.summary,
      record.mainCategory,
      record.subcategory,
      record.intent,
      record.sentiment,
      record.urgencyLevel,
      record.contentRecommendation,
      record.processingStatus,
      ...(record.keywords || [])
    ].join(" ").toLowerCase();

    if (search && !haystack.includes(search)) return false;
    if (menfessAnalyzerFilters.category && record.mainCategory !== menfessAnalyzerFilters.category) return false;
    if (menfessAnalyzerFilters.intent && record.intent !== menfessAnalyzerFilters.intent) return false;
    if (menfessAnalyzerFilters.status && record.processingStatus !== menfessAnalyzerFilters.status) return false;
    if (menfessAnalyzerFilters.recommendation && record.contentRecommendation !== menfessAnalyzerFilters.recommendation) return false;

    return true;
  });
}

function countMenfessByStatus(status) {
  return (menfessAnalyzerData || []).filter(item => item.processingStatus === status).length;
}

function renderMenfessDashboard() {
  const container = qs("menfessDashboard");
  if (!container) return;

  const stats = [
    ["Total menfess", menfessAnalyzerData.length, "fa-inbox"],
    ["Belum dianalisis", countMenfessByStatus("Belum dianalisis"), "fa-hourglass-start"],
    ["Sudah dianalisis", countMenfessByStatus("Sudah dianalisis"), "fa-check"],
    ["Perlu FAQ", countMenfessByStatus("Perlu FAQ"), "fa-circle-question"],
    ["Perlu Wiki", countMenfessByStatus("Perlu Wiki"), "fa-book-open"],
    ["Perlu Artikel", countMenfessByStatus("Perlu Artikel"), "fa-newspaper"],
    ["Selesai", countMenfessByStatus("Selesai"), "fa-flag-checkered"],
    ["Duplikat", countMenfessByStatus("Duplikat"), "fa-copy"]
  ];

  container.innerHTML = stats.map(([label, value, icon]) => `
    <article class="menfess-stat-card">
      <i class="fas ${icon}"></i>
      <div><strong>${value}</strong><span>${label}</span></div>
    </article>
  `).join("");
}

function renderMenfessRecord(record) {
  const keywords = (record.keywords || []).map(keyword => `<span>${escapeMenfessHTML(keyword)}</span>`).join("");
  const duplicateHTML = record.possibleDuplicates?.length ? `
    <div class="menfess-duplicates">
      <strong>Possible duplicates:</strong>
      ${record.possibleDuplicates.map(item => `<span>${escapeMenfessHTML(item.id)} • ${Math.round(item.score * 100)}%</span>`).join("")}
    </div>
  ` : "";

  return `
    <article class="menfess-card" data-id="${record.id}">
      <div class="menfess-card-head">
        <div>
          <p class="eyebrow">${escapeMenfessHTML(record.id)}</p>
          <h3>${escapeMenfessHTML(record.summary)}</h3>
        </div>
        <span class="menfess-status">${escapeMenfessHTML(record.processingStatus)}</span>
      </div>

      <p class="menfess-raw">${escapeMenfessHTML(record.rawContent)}</p>

      <div class="menfess-meta-grid">
        <span><b>Category</b>${escapeMenfessHTML(record.mainCategory)} / ${escapeMenfessHTML(record.subcategory)}</span>
        <span><b>Intent</b>${escapeMenfessHTML(record.intent)}</span>
        <span><b>Sentiment</b>${escapeMenfessHTML(record.sentiment)}</span>
        <span><b>Urgency</b>${escapeMenfessHTML(record.urgencyLevel)}</span>
        <span><b>Recommendation</b>${escapeMenfessHTML(record.contentRecommendation)}</span>
        <span><b>Updated</b>${formatMenfessDate(record.updatedDate)}</span>
      </div>

      <div class="menfess-keywords">${keywords || "<span>Tidak ada keyword</span>"}</div>
      ${duplicateHTML}

      <div class="menfess-actions">
        <select data-menfess-status="${record.id}">
          ${MENFESS_STATUSES.map(status => `<option value="${escapeMenfessHTML(status)}" ${status === record.processingStatus ? "selected" : ""}>${escapeMenfessHTML(status)}</option>`).join("")}
        </select>
        <button class="btn ghost" type="button" data-menfess-draft="faq" data-id="${record.id}">Generate Draft FAQ</button>
        <button class="btn ghost" type="button" data-menfess-draft="wiki" data-id="${record.id}">Generate Draft Wiki</button>
        <button class="btn ghost" type="button" data-menfess-draft="artikel" data-id="${record.id}">Generate Draft Artikel</button>
        <button class="btn danger" type="button" data-menfess-delete="${record.id}">Hapus</button>
      </div>
    </article>
  `;
}

function renderMenfessAnalyzer() {
  renderMenfessDashboard();

  const list = qs("menfessHistoryList");
  const count = qs("menfessResultCount");
  if (!list) return;

  const filtered = getFilteredMenfessRecords();
  if (count) count.textContent = `${filtered.length} hasil`;

  list.innerHTML = filtered.length
    ? filtered.map(renderMenfessRecord).join("")
    : `<div class="admin-list-item"><strong>Belum ada menfess.</strong><p>Masukkan raw menfess lalu klik Analyze Menfess.</p></div>`;
}

async function handleMenfessAnalyze() {
  const textarea = qs("menfessRawInput");
  const result = qs("menfessAnalysisResult");
  const button = qs("menfessAnalyzeBtn");
  if (!textarea) return;

  const rawText = textarea.value.trim();
  if (!rawText) {
    if (result) result.textContent = "Masukkan minimal satu menfess terlebih dahulu.";
    return;
  }

  try {
    if (button) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = "Menganalisis...";
    }
    if (result) result.textContent = "Sedang menganalisis menfess...";

    const records = await analyzeMenfessBatchWithAI(rawText, menfessAnalyzerData);
    await MenfessStorage.addMany(records);
    textarea.value = "";

    if (result) {
      const usingSupabase = typeof getMenfessSupabaseClient === "function" && !!getMenfessSupabaseClient();
      result.textContent = `${records.length} menfess berhasil dianalisis dan tersimpan ${usingSupabase ? "di Supabase" : "di fallback lokal"}.`;
    }

    renderMenfessAnalyzer();
  } catch (error) {
    console.error("Gagal menganalisis menfess:", error);
    if (result) result.textContent = `Gagal menganalisis menfess: ${error?.message || error}`;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.originalText || "Analyze Menfess";
    }
  }
}

async function handleMenfessStatusChange(event) {
  const select = event.target.closest("[data-menfess-status]");
  if (!select) return;

  await MenfessStorage.update(select.dataset.menfessStatus, {
    processingStatus: select.value
  });
  await MenfessStorage.load();
  renderMenfessAnalyzer();
}

function handleMenfessDraftClick(event) {
  const button = event.target.closest("[data-menfess-draft]");
  if (!button) return;

  const record = menfessAnalyzerData.find(item => item.id === button.dataset.id);
  const output = qs("menfessDraftOutput");
  if (!output) return;

  output.value = generateMenfessDraft(record, button.dataset.menfessDraft);
  output.focus();
}

async function handleMenfessDelete(event) {
  const button = event.target.closest("[data-menfess-delete]");
  if (!button) return;

  const confirmed = window.confirm("Hapus record menfess ini?");
  if (!confirmed) return;

  await MenfessStorage.remove(button.dataset.menfessDelete);
  await MenfessStorage.load();
  renderMenfessAnalyzer();
}

function bindMenfessFilters() {
  const map = {
    menfessSearch: "search",
    menfessCategoryFilter: "category",
    menfessIntentFilter: "intent",
    menfessStatusFilter: "status",
    menfessRecommendationFilter: "recommendation"
  };

  Object.entries(map).forEach(([id, key]) => {
    const element = qs(id);
    if (!element) return;
    element.addEventListener("input", () => {
      menfessAnalyzerFilters[key] = element.value;
      renderMenfessAnalyzer();
    });
    element.addEventListener("change", () => {
      menfessAnalyzerFilters[key] = element.value;
      renderMenfessAnalyzer();
    });
  });
}

function initMenfessAnalyzerUI() {
  if (menfessAnalyzerInitialized) return;

  populateMenfessSelect("menfessCategoryFilter", MENFESS_CATEGORIES, "Semua kategori");
  populateMenfessSelect("menfessIntentFilter", MENFESS_INTENTS, "Semua intent");
  populateMenfessSelect("menfessStatusFilter", MENFESS_STATUSES, "Semua status");
  populateMenfessSelect("menfessRecommendationFilter", MENFESS_RECOMMENDATIONS, "Semua rekomendasi");

  qs("menfessAnalyzeBtn")?.addEventListener("click", handleMenfessAnalyze);
  qs("menfessHistoryList")?.addEventListener("change", handleMenfessStatusChange);
  qs("menfessHistoryList")?.addEventListener("click", event => {
    handleMenfessDraftClick(event);
    handleMenfessDelete(event);
  });

  qs("menfessClearFilters")?.addEventListener("click", () => {
    Object.keys(menfessAnalyzerFilters).forEach(key => menfessAnalyzerFilters[key] = "");
    ["menfessSearch", "menfessCategoryFilter", "menfessIntentFilter", "menfessStatusFilter", "menfessRecommendationFilter"].forEach(id => {
      const element = qs(id);
      if (element) element.value = "";
    });
    renderMenfessAnalyzer();
  });

  bindMenfessFilters();
  menfessAnalyzerInitialized = true;
}

async function loadMenfessAnalyzerData() {
  initMenfessAnalyzerUI();
  try {
    await MenfessStorage.load();
  } catch (error) {
    console.error("Gagal load Menfess Analyzer:", error);
    const result = qs("menfessAnalysisResult");
    if (result) result.textContent = `Gagal memuat data menfess: ${error?.message || error}`;
  }
  renderMenfessAnalyzer();
}
