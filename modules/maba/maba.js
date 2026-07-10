const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const checklistKey = "saupi_maba_checklist_v1";

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeHref(value, fallback = "#") {
  const href = String(value || fallback).trim();

  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("./") ||
    href.startsWith("../") ||
    href.startsWith("#") ||
    href.endsWith(".html") ||
    href.includes(".html?")
  ) {
    return href;
  }

  return fallback;
}

function createCard(title, desc, href = "#") {
  return `
    <a href="${safeHref(href)}" class="maba-card maba-card-link">
      <h3>${escapeHTML(title || "Tanpa Judul")}</h3>
      <p>${escapeHTML(desc || "Belum ada deskripsi.")}</p>
    </a>
  `;
}

function createFaqItem(question, answer, keyword = "") {
  return `
    <div class="accordion-item faq-item" data-keyword="${escapeHTML(keyword)}">
      <button class="accordion-btn" type="button">${escapeHTML(question || "Pertanyaan")} <span>+</span></button>
      <div class="accordion-content">${escapeHTML(answer || "Jawaban belum tersedia.")}</div>
    </div>
  `;
}

function initChecklist() {
  const checklistInputs = document.querySelectorAll("#mabaChecklist input[type='checkbox']");
  const progressText = document.getElementById("progressText");
  const progressFill = document.getElementById("progressFill");
  let currentUser = null;

  function updateProgress() {
    const total = checklistInputs.length;
    const checked = [...checklistInputs].filter(input => input.checked).length;
    const percent = total ? Math.round((checked / total) * 100) : 0;

    if (progressText) progressText.textContent = percent + "%";
    if (progressFill) progressFill.style.width = percent + "%";
  }

  function readLocalChecklist() {
    try {
      return JSON.parse(localStorage.getItem(checklistKey) || "{}");
    } catch (error) {
      console.warn("Checklist lokal tidak dapat dibaca:", error);
      return {};
    }
  }

  function applyChecklist(saved) {
    checklistInputs.forEach(input => {
      input.checked = Boolean(saved[input.dataset.id]);
    });
    updateProgress();
  }

  async function syncChecklistFromAccount() {
    if (!supabaseClient) return;
    const { data: userData } = await supabaseClient.auth.getUser();
    currentUser = userData?.user || null;
    if (!currentUser) return;

    const { data, error } = await supabaseClient
      .from("checklist_progress")
      .select("item_key, completed")
      .eq("user_id", currentUser.id)
      .eq("checklist_key", "maba");
    if (error) {
      console.warn("Progress akun belum dapat dimuat:", error.message);
      return;
    }

    const local = readLocalChecklist();
    const remote = Object.fromEntries((data || []).map(item => [item.item_key, item.completed]));
    const merged = { ...local, ...remote };
    applyChecklist(merged);
    localStorage.setItem(checklistKey, JSON.stringify(merged));

    const rows = checklistInputs.map(input => ({
      user_id: currentUser.id,
      checklist_key: "maba",
      item_key: input.dataset.id,
      completed: Boolean(merged[input.dataset.id]),
      updated_at: new Date().toISOString()
    }));
    const { error: syncError } = await supabaseClient
      .from("checklist_progress")
      .upsert(rows, { onConflict: "user_id,checklist_key,item_key" });
    if (syncError) console.warn("Progress lokal belum dapat disinkronkan:", syncError.message);
  }

  function loadChecklist() {
    applyChecklist(readLocalChecklist());
  }

  async function saveChecklist(changedInput) {
    const data = {};
    checklistInputs.forEach(input => {
      data[input.dataset.id] = input.checked;
    });
    localStorage.setItem(checklistKey, JSON.stringify(data));
    updateProgress();

    if (!currentUser || !changedInput) return;
    const { error } = await supabaseClient.from("checklist_progress").upsert({
      user_id: currentUser.id,
      checklist_key: "maba",
      item_key: changedInput.dataset.id,
      completed: changedInput.checked,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,checklist_key,item_key" });
    if (error) console.warn("Progress belum dapat disinkronkan:", error.message);
  }

  checklistInputs.forEach(input => {
    input.addEventListener("change", () => saveChecklist(input));
  });

  loadChecklist();
  syncChecklistFromAccount().catch(error => console.warn("Sinkronisasi checklist gagal:", error));
}

function initQuickScroll() {
  document.querySelectorAll(".quick-card").forEach(card => {
    card.addEventListener("click", () => {
      const target = document.querySelector(card.dataset.target);

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
}

function initAccordion() {
  document.addEventListener("click", event => {
    const button = event.target.closest(".accordion-btn");
    if (!button) return;

    const item = button.closest(".accordion-item");
    if (item) item.classList.toggle("active");
  });
}

function initFaqSearch() {
  const faqSearch = document.getElementById("faqSearch");
  if (!faqSearch) return;

  faqSearch.addEventListener("input", () => {
    const keyword = faqSearch.value.toLowerCase().trim();

    document.querySelectorAll(".faq-item").forEach(item => {
      const text = item.textContent.toLowerCase() + " " + (item.dataset.keyword || "").toLowerCase();
      item.style.display = text.includes(keyword) ? "" : "none";
    });
  });
}

async function loadMabaWiki() {
  const container = document.getElementById("mabaWikiList");
  if (!container || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("wiki_kampus")
    .select("judul, ringkasan, slug, kategori")
    .or("kategori.ilike.%maba%,kategori.ilike.%mahasiswa baru%,judul.ilike.%maba%,judul.ilike.%mahasiswa baru%")
    .limit(4);

  if (error || !data || data.length === 0) return;

  container.innerHTML = data.map(item => {
    const href = item.slug ? `wiki-detail.html?slug=${encodeURIComponent(item.slug)}` : "wiki.html";
    return createCard(item.judul, item.ringkasan, href);
  }).join("");
}

async function loadMabaDokumen() {
  const container = document.getElementById("mabaDokumenList");
  if (!container || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("dokumen")
    .select("judul, deskripsi, file_url, kategori")
    .or("kategori.ilike.%maba%,kategori.ilike.%mahasiswa baru%,judul.ilike.%pedoman%,judul.ilike.%kalender%")
    .limit(4);

  if (error || !data || data.length === 0) return;

  container.innerHTML = data.map(item => {
    return createCard(item.judul, item.deskripsi, item.file_url || "dokumen.html");
  }).join("");
}

async function loadMabaFaq() {
  const container = document.getElementById("faqList");
  if (!container || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("faq")
    .select("pertanyaan, jawaban, kategori")
    .or("kategori.ilike.%maba%,kategori.ilike.%mahasiswa baru%,pertanyaan.ilike.%ukt%,pertanyaan.ilike.%krs%")
    .limit(8);

  if (error || !data || data.length === 0) return;

  container.innerHTML = data.map(item => {
    return createFaqItem(item.pertanyaan, item.jawaban, item.kategori || "");
  }).join("");
}

async function loadMabaKomunitas() {
  const container = document.getElementById("mabaKomunitasList");
  if (!container || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("komunitas")
    .select("nama, deskripsi, link, kategori")
    .or("kategori.ilike.%maba%,kategori.ilike.%jurusan%,kategori.ilike.%ukm%,nama.ilike.%angkatan%")
    .limit(4);

  if (error || !data || data.length === 0) return;

  container.innerHTML = data.map(item => {
    return createCard(item.nama, item.deskripsi, item.link || "komunitas.html");
  }).join("");
}

async function loadDynamicMabaContent() {
  await Promise.allSettled([
    loadMabaWiki(),
    loadMabaDokumen(),
    loadMabaFaq(),
    loadMabaKomunitas()
  ]);
}

let mabaCalendarData = [];
let activeCalendarCategory = "Semua";

function formatTanggalIndonesia(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString + "T00:00:00");

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getDayNumber(dateString) {
  const date = new Date(dateString + "T00:00:00");
  return date.getDate();
}

function getMonthYear(dateString) {
  const date = new Date(dateString + "T00:00:00");

  return date.toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric"
  });
}

function getCountdownLabel(startDateString, endDateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDateString + "T00:00:00");
  const end = endDateString
    ? new Date(endDateString + "T00:00:00")
    : start;

  const diffStart = Math.ceil((start - today) / (1000 * 60 * 60 * 24));

  if (today >= start && today <= end) return "Hari ini";
  if (diffStart === 1) return "Besok";
  if (diffStart > 1) return `${diffStart} hari lagi`;
  return "Selesai";
}

function renderCalendarFilters(data) {
  const filterContainer = document.getElementById("mabaCalendarFilter");
  if (!filterContainer) return;

  const categories = ["Semua", ...new Set(data.map(item => item.kategori || "Umum"))];

  filterContainer.innerHTML = categories.map(category => `
    <button class="${category === activeCalendarCategory ? "active" : ""}" data-category="${category}">
      ${category}
    </button>
  `).join("");

  filterContainer.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      activeCalendarCategory = button.dataset.category;
      renderCalendarFilters(mabaCalendarData);
      renderMabaCalendar();
    });
  });
}

function renderMabaCalendar() {
  const container = document.getElementById("mabaCalendarList");
  const searchInput = document.getElementById("mabaCalendarSearch");

  if (!container) return;

  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

  let filtered = [...mabaCalendarData];

  if (activeCalendarCategory !== "Semua") {
    filtered = filtered.filter(item => (item.kategori || "Umum") === activeCalendarCategory);
  }

  if (keyword) {
    filtered = filtered.filter(item => {
      const text = [
        item.judul,
        item.deskripsi,
        item.kategori,
        item.status
      ].join(" ").toLowerCase();

      return text.includes(keyword);
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="maba-card">
        <h3>Agenda tidak ditemukan</h3>
        <p>Coba gunakan kata kunci atau kategori lain.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const tanggal = item.tanggal_selesai
      ? `${formatTanggalIndonesia(item.tanggal_mulai)} - ${formatTanggalIndonesia(item.tanggal_selesai)}`
      : formatTanggalIndonesia(item.tanggal_mulai);

    const link = item.link
      ? `<a href="${item.link}" class="maba-btn">Detail</a>`
      : "";

    return `
      <article class="maba-calendar-card" data-category="${item.kategori || "Umum"}">
        <div class="maba-calendar-date">
          <strong>${getDayNumber(item.tanggal_mulai)}</strong>
          <span>${getMonthYear(item.tanggal_mulai)}</span>
        </div>

        <div class="maba-calendar-content">
          <h3>${item.judul}</h3>
          <p>${item.deskripsi || "Belum ada deskripsi."}</p>

          <div class="maba-calendar-meta">
            <span class="maba-calendar-pill">${item.kategori || "Umum"}</span>
            <span class="maba-calendar-pill">${tanggal}</span>
          </div>
        </div>

        <div class="maba-calendar-countdown">
          ${getCountdownLabel(item.tanggal_mulai, item.tanggal_selesai)}
          <div style="margin-top:10px;">${link}</div>
        </div>
      </article>
    `;
  }).join("");
}

async function loadMabaCalendar() {
  const container = document.getElementById("mabaCalendarList");
  if (!container || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("kalender_maba")
    .select("judul, deskripsi, tanggal_mulai, tanggal_selesai, kategori, status, link, urutan")
    .eq("status", "Aktif")
    .order("tanggal_mulai", { ascending: true })
    .order("urutan", { ascending: true });

  if (error || !data || data.length === 0) {
    container.innerHTML = `
      <div class="maba-card">
        <h3>Kalender belum tersedia</h3>
        <p>Agenda mahasiswa baru belum ditambahkan.</p>
      </div>
    `;
    return;
  }

  mabaCalendarData = data;
  renderCalendarFilters(data);
  renderMabaCalendar();

  const searchInput = document.getElementById("mabaCalendarSearch");

  if (searchInput) {
    searchInput.addEventListener("input", renderMabaCalendar);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initChecklist();
  initQuickScroll();
  initAccordion();
  initFaqSearch();
  /*loadDynamicMabaContent();*/
  loadMabaCalendar();
});

