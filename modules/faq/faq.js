const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let faqData = [];
let activeFaqKategori = "all";
let currentFaqPage = 1;
const FAQ_ITEMS_PER_PAGE = 8;

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function showSimpleLoading(targetId, message = "Memuat data...") {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <span>${message}</span>
    </div>
  `;
}

function showError(targetId, message = "Gagal memuat data.") {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `<div class="empty">${message}</div>`;
}

function prepareFaqSearch() {
  faqData = faqData.map(item => ({
    ...item,
    searchText: `
      ${item.pertanyaan || ""}
      ${item.jawaban || ""}
      ${item.kategori || ""}
    `.toLowerCase()
  }));
}

async function loadFaq() {
  showSimpleLoading("faqContainer", "Memuat FAQ...");

  const cacheKey = "faq_kampus_v3";
  const cached = getCache(cacheKey, 720);

  if (cached) {
    faqData = cached;
    initFaqUI();
    return;
  }

  const { data, error } = await supabaseClient
    .from("faq_kampus")
    .select("pertanyaan, jawaban, kategori")
    .order("kategori")
    .order("pertanyaan");

  if (error) {
    console.error("Gagal mengambil FAQ:", error);
    showError("faqContainer", "Gagal memuat FAQ.");
    updateFaqMeta(0, 0);
    return;
  }

  faqData = data || [];
  setCache(cacheKey, faqData);

  initFaqUI();
}

function initFaqUI() {
  prepareFaqSearch();
  renderFaqCategoryChips();
  renderPopularFaq();
  renderFaq();
}

function getFilteredFaq() {
  const searchInput = document.getElementById("faqSearch");
  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

  return faqData.filter(item => {
    const matchSearch = item.searchText.includes(keyword);

    const matchKategori =
      activeFaqKategori === "all" ||
      item.kategori === activeFaqKategori;

    return matchSearch && matchKategori;
  });
}

function updateFaqMeta(filteredCount, totalCount) {
  const meta = document.getElementById("faqMeta");
  if (!meta) return;

  const kategoriText =
    activeFaqKategori === "all"
      ? "Semua kategori"
      : activeFaqKategori;

  meta.innerHTML = `
    <span><strong>${filteredCount}</strong> FAQ ditemukan</span>
    <span>•</span>
    <span>${escapeHTML(kategoriText)}</span>
    <span>•</span>
    <span>Total ${totalCount} FAQ</span>
  `;
}

function getPaginationRange(currentPage, totalPages) {
  const pages = [];
  const windowSize = 1;

  for (let page = 1; page <= totalPages; page += 1) {
    const isEdge = page === 1 || page === totalPages;
    const isNearCurrent = Math.abs(page - currentPage) <= windowSize;

    if (isEdge || isNearCurrent) {
      pages.push(page);
      continue;
    }

    if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return pages;
}

function renderFaqPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / FAQ_ITEMS_PER_PAGE);

  if (totalPages <= 1) return "";

  const pages = getPaginationRange(currentFaqPage, totalPages)
    .map(page => {
      if (page === "...") {
        return `<span class="faq-pagination-ellipsis" aria-hidden="true">...</span>`;
      }

      return `
        <button
          class="faq-page-button${page === currentFaqPage ? " active" : ""}"
          type="button"
          data-page="${page}"
          aria-label="Buka halaman ${page}"
          ${page === currentFaqPage ? 'aria-current="page"' : ""}
        >
          ${page}
        </button>
      `;
    })
    .join("");

  return `
    <nav class="faq-pagination" aria-label="Navigasi halaman FAQ">
      <button
        class="faq-page-nav"
        type="button"
        data-page="${currentFaqPage - 1}"
        ${currentFaqPage === 1 ? "disabled" : ""}
      >
        <i class="fas fa-chevron-left"></i>
        Sebelumnya
      </button>

      <div class="faq-page-numbers">
        ${pages}
      </div>

      <button
        class="faq-page-nav"
        type="button"
        data-page="${currentFaqPage + 1}"
        ${currentFaqPage === totalPages ? "disabled" : ""}
      >
        Berikutnya
        <i class="fas fa-chevron-right"></i>
      </button>
    </nav>
  `;
}

function bindFaqPagination(container, totalPages) {
  container.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
      const nextPage = Number(button.dataset.page);

      if (!nextPage || nextPage === currentFaqPage) return;

      currentFaqPage = Math.min(Math.max(nextPage, 1), totalPages);
      renderFaq();

      container.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

function highlightKeyword(text) {
  const searchInput = document.getElementById("faqSearch");
  const keyword = searchInput ? searchInput.value.trim() : "";

  const safeText = escapeHTML(text);

  if (!keyword) return safeText;

  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedKeyword})`, "gi");

  return safeText.replace(regex, `<mark>$1</mark>`);
}

function createFaqCard(item) {
  return `
    <details class="faq-item">
      <summary>
        <span class="faq-summary-top">
          <span class="pill">${escapeHTML(item.kategori || "FAQ")}</span>
          <i class="fas fa-chevron-down faq-arrow"></i>
        </span>

        <span class="faq-question">
          ${highlightKeyword(item.pertanyaan)}
        </span>
      </summary>

      <div class="faq-answer">
        ${highlightKeyword(item.jawaban).replace(/\n/g, "<br>")}
      </div>
    </details>
  `;
}

function renderFaq() {
  const container = document.getElementById("faqContainer");
  if (!container) return;

  const filtered = getFilteredFaq();
  const totalPages = Math.ceil(filtered.length / FAQ_ITEMS_PER_PAGE) || 1;

  currentFaqPage = Math.min(currentFaqPage, totalPages);

  const startIndex = (currentFaqPage - 1) * FAQ_ITEMS_PER_PAGE;
  const visibleFaq = filtered.slice(startIndex, startIndex + FAQ_ITEMS_PER_PAGE);

  updateFaqMeta(filtered.length, faqData.length);

  if (filtered.length) {
    container.innerHTML = `
      ${visibleFaq.map(createFaqCard).join("")}
      ${renderFaqPagination(filtered.length)}
    `;

    bindFaqPagination(container, totalPages);
    return;
  }

  container.innerHTML = `
    <div class="empty faq-empty">
      <div class="empty-icon">❓</div>
      <h3>FAQ tidak ditemukan</h3>
      <p>Coba gunakan kata kunci lain atau pilih kategori berbeda.</p>
    </div>
  `;
}

function renderFaqCategoryChips() {
  const container = document.getElementById("faqCategoryChips");
  if (!container) return;

  const kategoriList = [...new Set(
    faqData
      .map(item => item.kategori)
      .filter(Boolean)
  )];

  container.innerHTML =
    `<button class="category-chip active" data-kategori="all">Semua</button>` +
    kategoriList
      .map(item => `
        <button class="category-chip" data-kategori="${escapeHTML(item)}">
          ${escapeHTML(item)}
        </button>
      `)
      .join("");

  container.querySelectorAll(".category-chip").forEach(button => {
    button.addEventListener("click", () => {
      container.querySelectorAll(".category-chip").forEach(btn => {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      activeFaqKategori = button.dataset.kategori;
      currentFaqPage = 1;

      renderFaq();
    });
  });
}

function renderPopularFaq() {
  const popularGrid = document.getElementById("faqPopularGrid");
  const popularSection = document.getElementById("faqPopularSection");

  if (!popularGrid || !popularSection) return;

  const popularKeywords = [
    "ukt",
    "krs",
    "beasiswa",
    "registrasi",
    "kuliah"
  ];

  const popularItems = faqData
    .filter(item => {
      const text = `${item.pertanyaan} ${item.jawaban} ${item.kategori}`.toLowerCase();
      return popularKeywords.some(keyword => text.includes(keyword));
    })
    .slice(0, 6);

  if (!popularItems.length) {
    popularSection.style.display = "none";
    return;
  }

  popularGrid.innerHTML = popularItems.map(item => `
    <button class="faq-popular-card" type="button">
      <span>${escapeHTML(item.kategori || "FAQ")}</span>
      <strong>${escapeHTML(item.pertanyaan)}</strong>
    </button>
  `).join("");

  popularGrid.querySelectorAll(".faq-popular-card").forEach((button, index) => {
    button.addEventListener("click", () => {
      const searchInput = document.getElementById("faqSearch");
      if (!searchInput) return;

      searchInput.value = popularItems[index].pertanyaan;
      activeFaqKategori = "all";
      currentFaqPage = 1;

      document.querySelectorAll("#faqCategoryChips .category-chip").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.kategori === "all");
      });

      renderFaq();

      document.getElementById("faqContainer")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

const faqSearch = document.getElementById("faqSearch");

if (faqSearch) {
  let faqTimer;

  faqSearch.addEventListener("input", () => {
    clearTimeout(faqTimer);

    faqTimer = setTimeout(() => {
      currentFaqPage = 1;
      renderFaq();
    }, 250);
  });
}

loadFaq();