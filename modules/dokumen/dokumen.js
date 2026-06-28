const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dokumenData = [];
let activeDokumenKategori = "all";

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function showLoading(targetId, count = 6) {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = Array.from({ length: count }).map(() => `
    <article class="dokumen-card skeleton-dokumen">
      <div class="skeleton-icon"></div>
      <div class="skeleton-line title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </article>
  `).join("");
}

function showError(targetId, message = "Gagal memuat data.") {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = `<div class="dokumen-empty">⚠️ ${message}</div>`;
}

function showEmptyState() {
  const container = document.getElementById("dokumenList");
  if (!container) return;

  container.innerHTML = `
    <div class="dokumen-empty">
      <div class="dokumen-empty-icon">📄</div>
      <h3>Dokumen tidak ditemukan</h3>
      <p>Coba gunakan kata kunci lain atau pilih kategori berbeda.</p>
    </div>
  `;
}

function prepareDokumenSearch() {
  dokumenData = dokumenData.map(item => ({
    ...item,
    searchText: `
      ${item.judul || ""}
      ${item.deskripsi || ""}
      ${item.kategori || ""}
      ${item.link || ""}
    `.toLowerCase()
  }));
}

function getDokumenIcon(item) {
  const text = `${item.judul || ""} ${item.kategori || ""} ${item.link || ""}`.toLowerCase();

  if (text.includes("pdf")) return "fa-file-pdf";
  if (text.includes("sk") || text.includes("surat")) return "fa-file-signature";
  if (text.includes("panduan") || text.includes("pedoman")) return "fa-book-open";
  if (text.includes("kalender")) return "fa-calendar-days";
  if (text.includes("form")) return "fa-clipboard-list";
  if (text.includes("drive") || text.includes("docs.google")) return "fa-cloud-arrow-down";

  return "fa-file-lines";
}

function getDokumenType(item) {
  const link = String(item.link || "").toLowerCase();

  if (link.includes(".pdf")) return "PDF";
  if (link.includes("drive.google")) return "Google Drive";
  if (link.includes("docs.google")) return "Google Docs";

  return "Dokumen";
}

async function loadDokumen() {
  showLoading("dokumenList", 6);

  const cacheKey = "dokumen_kampus_v3";
  const cached = getCache(cacheKey, 720);

  if (cached) {
    dokumenData = cached;
    prepareDokumenSearch();
    renderDokumenKategoriFilter();
    renderDokumenCategoryChips();
    renderDokumen();
    return;
  }

  const { data, error } = await supabaseClient
    .from("dokumen_kampus")
    .select("judul, deskripsi, kategori, link")
    .order("kategori")
    .order("judul");

  if (error) {
    console.error("Gagal mengambil dokumen:", error);
    showError("dokumenList", "Gagal memuat dokumen.");
    return;
  }

  dokumenData = data || [];

  prepareDokumenSearch();
  setCache(cacheKey, dokumenData);

  renderDokumenKategoriFilter();
  renderDokumenCategoryChips();
  renderDokumen();
}

function renderDokumenKategoriFilter() {
  const select = document.getElementById("dokumenKategoriFilter");
  if (!select) return;

  const kategoriList = [...new Set(
    dokumenData.map(item => item.kategori).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  select.innerHTML =
    `<option value="all">Semua Kategori</option>` +
    kategoriList
      .map(kategori => `<option value="${escapeHTML(kategori)}">${escapeHTML(kategori)}</option>`)
      .join("");

  select.addEventListener("change", () => {
    activeDokumenKategori = select.value;

    document.querySelectorAll(".category-chip").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.kategori === activeDokumenKategori);
    });

    renderDokumen();
  });
}

function renderDokumenCategoryChips() {
  const container = document.getElementById("dokumenCategoryChips");
  if (!container) return;

  const kategoriCounts = {};

  dokumenData.forEach(item => {
    if (!item.kategori) return;
    kategoriCounts[item.kategori] = (kategoriCounts[item.kategori] || 0) + 1;
  });

  container.innerHTML =
    `<button class="category-chip active" data-kategori="all">
      Semua <span>${dokumenData.length}</span>
    </button>` +
    Object.entries(kategoriCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kategori, count]) => `
        <button class="category-chip" data-kategori="${escapeHTML(kategori)}">
          ${escapeHTML(kategori)} <span>${count}</span>
        </button>
      `)
      .join("");

  container.querySelectorAll(".category-chip").forEach(button => {
    button.addEventListener("click", () => {
      container.querySelectorAll(".category-chip").forEach(btn => {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      activeDokumenKategori = button.dataset.kategori;

      const select = document.getElementById("dokumenKategoriFilter");
      if (select) select.value = activeDokumenKategori;

      renderDokumen();
    });
  });
}

function sortDokumen(data) {
  const sortValue = document.getElementById("dokumenSort")?.value || "az";
  const copied = [...data];

  if (sortValue === "za") {
    return copied.sort((a, b) => String(b.judul || "").localeCompare(String(a.judul || "")));
  }

  if (sortValue === "kategori") {
    return copied.sort((a, b) => {
      const kategoriCompare = String(a.kategori || "").localeCompare(String(b.kategori || ""));
      if (kategoriCompare !== 0) return kategoriCompare;
      return String(a.judul || "").localeCompare(String(b.judul || ""));
    });
  }

  return copied.sort((a, b) => String(a.judul || "").localeCompare(String(b.judul || "")));
}

function renderDokumen() {
  const searchInput = document.getElementById("dokumenSearch");
  const container = document.getElementById("dokumenList");
  const resultInfo = document.getElementById("dokumenResultInfo");
  const totalInfo = document.getElementById("dokumenTotal");

  if (!container) return;

  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

  let filtered = dokumenData.filter(item => {
    const matchSearch = !keyword || item.searchText.includes(keyword);

    const matchKategori =
      activeDokumenKategori === "all" ||
      item.kategori === activeDokumenKategori;

    return matchSearch && matchKategori;
  });

  filtered = sortDokumen(filtered);

  if (totalInfo) totalInfo.textContent = dokumenData.length;

  if (resultInfo) {
    resultInfo.textContent = keyword || activeDokumenKategori !== "all"
      ? `Menampilkan ${filtered.length} dari ${dokumenData.length} dokumen`
      : `${dokumenData.length} dokumen tersedia`;
  }

  if (!filtered.length) {
    showEmptyState();
    return;
  }

  container.innerHTML = filtered.map(createDokumenCard).join("");
}

function createDokumenCard(item) {
  const icon = getDokumenIcon(item);
  const type = getDokumenType(item);

  return `
    <article class="dokumen-card">
      <div class="dokumen-card-top">
        <div class="dokumen-icon">
          <i class="fas ${icon}"></i>
        </div>

        <span class="dokumen-type">${escapeHTML(type)}</span>
      </div>

      <div class="dokumen-card-body">
        <span class="dokumen-category">
          ${escapeHTML(item.kategori || "Dokumen")}
        </span>

        <h3>${escapeHTML(item.judul || "Tanpa Judul")}</h3>

        <p>${escapeHTML(item.deskripsi || "Belum ada deskripsi untuk dokumen ini.")}</p>
      </div>

      <div class="dokumen-card-footer">
        <a
          href="${escapeHTML(item.link)}"
          target="_blank"
          rel="noopener noreferrer"
          class="dokumen-btn"
        >
          Buka Dokumen
          <i class="fas fa-arrow-up-right-from-square"></i>
        </a>
      </div>
    </article>
  `;
}

const dokumenSearch = document.getElementById("dokumenSearch");
const dokumenSort = document.getElementById("dokumenSort");

if (dokumenSearch) {
  let dokumenTimer;

  dokumenSearch.addEventListener("input", () => {
    clearTimeout(dokumenTimer);

    dokumenTimer = setTimeout(() => {
      renderDokumen();
    }, 250);
  });
}

if (dokumenSort) {
  dokumenSort.addEventListener("change", renderDokumen);
}

loadDokumen();