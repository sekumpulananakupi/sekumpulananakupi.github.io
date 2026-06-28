const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/*
  SA UPI - script optimasi agresif
  Fokus:
  1. Konten awal 3 item per jenis.
  2. Pagination / tombol muat lagi otomatis jika elemen tombol tersedia.
  3. Query Supabase hanya ambil kolom yang dipakai.
  4. Isi lengkap tetap aman untuk detail page, bukan untuk card/list.
  5. Cache localStorage 5 menit agar pindah halaman / refresh terasa ringan.
  6. FAQ dan dokumen dimuat setelah konten utama.
*/

const PAGE_SIZE = 3;
const MINI_LIMIT = 4;
const CACHE_TTL = 5 * 60 * 1000;

const TABLE_CONFIG = {
  info: {
    table: "informasi_kampus",
    columns: "id, judul, kategori, isi, gambar, created_at",
    searchColumns: "judul, isi, kategori",
    orderColumn: "created_at",
  },
  wiki: {
    table: "wiki_kampus",
    columns: "id, judul, kategori, isi, gambar, created_at",
    searchColumns: "judul, isi, kategori",
    orderColumn: "created_at",
  },
  job: {
    table: "lowongan_kerja",
    columns: "id, posisi, perusahaan, lokasi, gambar, created_at",
    searchColumns: "posisi, perusahaan, lokasi",
    orderColumn: "created_at",
  },
};

let activeFilter = "all";
let activeJobJurusan = "all";

let infoData = [];
let wikiData = [];
let jobData = [];
let kategoriData = [];
let artikelKategoriData = [];
let jurusanData = [];
let artikelJurusanData = [];
let dokumenData = [];
let faqData = [];

let pageState = {
  info: { page: 0, hasMore: true, keyword: "" },
  wiki: { page: 0, hasMore: true, keyword: "" },
  job: { page: 0, hasMore: true, keyword: "" },
};

function cacheKey(key) {
  return `saupi_cache_${key}`;
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
  } catch (error) {
    console.warn("Cache gagal dibaca:", key, error);
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(
      cacheKey(key),
      JSON.stringify({ time: Date.now(), data }),
    );
  } catch (error) {
    console.warn("Cache gagal disimpan:", key, error);
  }
}

function escapeHTML(text) {
  return String(text || "").replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[char],
  );
}

function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

function makeExcerpt(text, maxLength = 120) {
  const clean = stripHTML(text).replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showLoading(targetId, count = 3) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = Array.from({ length: count })
    .map(
      () => `
    <article class="skeleton-card">
      <div class="skeleton-line title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </article>
  `,
    )
    .join("");
}

function showSimpleLoading(targetId, message = "Memuat data...") {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      ${escapeHTML(message)}
    </div>
  `;
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function fetchPaged(type, { append = false } = {}) {
  const config = TABLE_CONFIG[type];
  const state = pageState[type];
  const from = state.page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const keyword = state.keyword.trim();
  const cacheId = `${type}_${state.page}_${keyword}_${activeFilter}_${activeJobJurusan}`;

  const cached = getCache(cacheId);
  if (cached) {
    applyPagedData(type, cached, append);
    return;
  }

  let query = supabaseClient
    .from(config.table)
    .select(config.columns)
    .order(config.orderColumn, { ascending: false })
    .range(from, to);

  if (keyword) {
    const escapedKeyword = keyword.replace(/[%_]/g, "");
    query = query.or(
      config.searchColumns
        .split(",")
        .map((column) => `${column.trim()}.ilike.%${escapedKeyword}%`)
        .join(","),
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error(`Gagal mengambil ${type}:`, error);
    applyPagedData(type, [], append);
    return;
  }

  setCache(cacheId, data || []);
  applyPagedData(type, data || [], append);
}

function applyPagedData(type, rows, append) {
  if (type === "info") infoData = append ? mergeById(infoData, rows) : rows;
  if (type === "wiki") wikiData = append ? mergeById(wikiData, rows) : rows;
  if (type === "job") jobData = append ? mergeById(jobData, rows) : rows;

  pageState[type].hasMore = rows.length === PAGE_SIZE;
  renderAll();
  updateLoadMoreButtons();
}

function mergeById(oldRows, newRows) {
  const map = new Map();
  [...oldRows, ...newRows].forEach((row) => map.set(String(row.id), row));
  return Array.from(map.values());
}

async function loadCoreData() {
  showLoading("latestList", 3);
  showLoading("latestJobList", 3);
  showLoading("infoList", 3);
  showLoading("wikiList", 3);
  showLoading("jobList", 3);

  const cachedCore = getCache("core_relations");
  if (cachedCore) {
    kategoriData = cachedCore.kategoriData || [];
    artikelKategoriData = cachedCore.artikelKategoriData || [];
    jurusanData = cachedCore.jurusanData || [];
    artikelJurusanData = cachedCore.artikelJurusanData || [];
  } else {
    const [
      kategoriResult,
      artikelKategoriResult,
      jurusanResult,
      artikelJurusanResult,
    ] = await Promise.all([
      supabaseClient.from("kategori").select("id, nama"),
      supabaseClient
        .from("artikel_kategori")
        .select("artikel_tipe, artikel_id, kategori_id"),
      supabaseClient
        .from("jurusan")
        .select("id, nama")
        .order("nama", { ascending: true }),
      supabaseClient
        .from("artikel_jurusan")
        .select("artikel_tipe, artikel_id, jurusan_id"),
    ]);

    const firstError = [
      kategoriResult.error,
      artikelKategoriResult.error,
      jurusanResult.error,
      artikelJurusanResult.error,
    ].find(Boolean);

    if (firstError) console.error("Gagal mengambil data relasi:", firstError);

    kategoriData = kategoriResult.data || [];
    artikelKategoriData = artikelKategoriResult.data || [];
    jurusanData = jurusanResult.data || [];
    artikelJurusanData = artikelJurusanResult.data || [];

    setCache("core_relations", {
      kategoriData,
      artikelKategoriData,
      jurusanData,
      artikelJurusanData,
    });
  }

  renderJurusanJobFilter();

  await Promise.all([
    fetchPaged("info"),
    fetchPaged("wiki"),
    fetchPaged("job"),
  ]);

  setTimeout(loadDeferredData, 100);
}

async function loadDeferredData() {
  showSimpleLoading("homeDokumenList", "Memuat dokumen...");
  showSimpleLoading("homeFaqList", "Memuat FAQ...");

  const cachedMini = getCache("mini_home");
  if (cachedMini) {
    dokumenData = cachedMini.dokumenData || [];
    faqData = cachedMini.faqData || [];
    renderHomeDokumen();
    renderHomeFaq();
    return;
  }

  const [dokumenResult, faqResult] = await Promise.all([
    supabaseClient
      .from("dokumen_kampus")
      .select("id, judul, kategori, link, created_at")
      .order("created_at", { ascending: false })
      .limit(MINI_LIMIT),
    supabaseClient
      .from("faq_kampus")
      .select("id, pertanyaan, kategori, created_at")
      .order("created_at", { ascending: false })
      .limit(MINI_LIMIT),
  ]);

  if (dokumenResult.error || faqResult.error) {
    console.error(
      "Gagal mengambil dokumen/FAQ:",
      dokumenResult.error || faqResult.error,
    );
  }

  dokumenData = dokumenResult.data || [];
  faqData = faqResult.data || [];
  setCache("mini_home", { dokumenData, faqData });
  renderHomeDokumen();
  renderHomeFaq();
}

function requestIdleCallbackSafe(callback) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 1500 });
  } else {
    setTimeout(callback, 300);
  }
}

function getDataByType(type) {
  if (type === "info") return infoData;
  if (type === "wiki") return wikiData;
  if (type === "job") return jobData;
  return [];
}

function getSearchText(type, item) {
  if (type === "info" || type === "wiki") {
    return `${item.judul || ""} ${item.kategori || ""} ${stripHTML(item.isi || "")}`.toLowerCase();
  }
  return `${item.posisi || ""} ${item.perusahaan || ""} ${item.lokasi || ""} ${stripHTML(item.deskripsi || "")}`.toLowerCase();
}

function filterLocalData(type, data) {
  const keyword = (document.getElementById(`${type}Search`)?.value || "")
    .trim()
    .toLowerCase();

  return data.filter((item) => {
    const matchSearch = !keyword || getSearchText(type, item).includes(keyword);

    let matchFilter = true;
    if (activeFilter !== "all") {
      if (type === "info" || type === "wiki") {
        const kategoriNames = getArtikelKategori(type, item.id).map((nama) =>
          nama.toLowerCase(),
        );
        matchFilter = kategoriNames.some((nama) => nama.includes(activeFilter));
      }
      if (type === "job") matchFilter = activeFilter === "lowongan";
    }

    let matchJurusan = true;
    if (type === "job" && activeJobJurusan !== "all") {
      matchJurusan = artikelJurusanData.some(
        (row) =>
          row.artikel_tipe === "job" &&
          String(row.artikel_id) === String(item.id) &&
          String(row.jurusan_id) === String(activeJobJurusan),
      );
    }

    return matchSearch && matchFilter && matchJurusan;
  });
}

function renderList(type, listId) {
  const list = document.getElementById(listId);
  if (!list) return;

  const filtered = filterLocalData(type, getDataByType(type));
  list.innerHTML = filtered.length
    ? filtered.map((item) => createCard(type, item)).join("")
    : `<div class="empty">Belum ada data.</div>`;
}

function createCard(type, item) {
  if (type === "info") {
    return `
      <article class="item-card">
        ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.judul)}" loading="lazy" decoding="async">` : ""}
        ${renderKategoriPills("info", item.id)}
        <h3>${escapeHTML(item.judul)}</h3>
        <p>${escapeHTML(makeExcerpt(item.isi))}</p>
        <a class="btn ghost" href="../pages/post.html?type=info&id=${encodeURIComponent(item.id)}">Baca Selengkapnya</a>
      </article>
    `;
  }

  if (type === "wiki") {
    return `
      <article class="item-card">
        ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.judul)}" loading="lazy" decoding="async">` : ""}
        ${renderKategoriPills("wiki", item.id) || `<span class="pill">${escapeHTML(item.kategori || "Wiki")}</span>`}
        <h3>${escapeHTML(item.judul)}</h3>
        <p>${escapeHTML(makeExcerpt(item.isi))}</p>
        <a class="btn ghost" href="../pages/post.html?type=wiki&id=${encodeURIComponent(item.id)}">Baca Selengkapnya</a>
      </article>
    `;
  }

  return `
    <article class="item-card">
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.posisi)}" loading="lazy" decoding="async">` : ""}
      <span class="pill">${escapeHTML(item.perusahaan)}</span>
      <span class="pill">${escapeHTML(item.lokasi || "Fleksibel")}</span>
      <h3>${escapeHTML(item.posisi)}</h3>
      <p>${escapeHTML(item.lokasi || "Detail lowongan tersedia di halaman detail.")}</p>
      <a class="btn ghost" href="../pages/post.html?type=job&id=${encodeURIComponent(item.id)}">Lihat Detail</a>
    </article>
  `;
}

function createLatestCard(item) {
  return `
    <article class="item-card">
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.title)}" loading="lazy" decoding="async">` : ""}
      <span class="pill">${escapeHTML(item.label)}</span>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(makeExcerpt(item.content))}</p>
      <a class="btn ghost" href="../pages/post.html?type=${encodeURIComponent(item.type)}&id=${encodeURIComponent(item.id)}">Baca Selengkapnya</a>
    </article>
  `;
}

function renderLatest() {
  const latestList = document.getElementById("latestList");
  if (!latestList) return;

  const combined = [
    ...infoData.map((item) => ({
      id: item.id,
      type: "info",
      title: item.judul || "",
      content: item.isi || "",
      gambar: item.gambar || "",
      label:
        getArtikelKategori("info", item.id)[0] ||
        item.kategori ||
        "Info Kampus",
      created_at: item.created_at || "",
    })),
    ...wikiData.map((item) => ({
      id: item.id,
      type: "wiki",
      title: item.judul || "",
      content: item.isi || "",
      gambar: item.gambar || "",
      label:
        getArtikelKategori("wiki", item.id)[0] ||
        item.kategori ||
        "Wiki Kampus",
      created_at: item.created_at || "",
    })),
    ...jobData.map((item) => ({
      id: item.id,
      type: "job",
      title: item.posisi || "",
      content: item.lokasi || "Lowongan kerja terbaru.",
      gambar: item.gambar || "",
      label: item.perusahaan || "Lowongan",
      created_at: item.created_at || "",
    })),
  ];

  const latest = combined
    .filter((item) => item.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, PAGE_SIZE);

  latestList.innerHTML = latest.length
    ? latest.map((item) => createLatestCard(item)).join("")
    : `<div class="empty">Belum ada artikel terbaru.</div>`;
}

function renderLatestJobs() {
  const list = document.getElementById("latestJobList");
  if (!list) return;
  const latestJobs = jobData.slice(0, PAGE_SIZE);
  list.innerHTML = latestJobs.length
    ? latestJobs.map((item) => createCard("job", item)).join("")
    : `<div class="empty">Belum ada lowongan terbaru.</div>`;
}

function renderHomeDokumen() {
  const list = document.getElementById("homeDokumenList");
  if (!list) return;
  list.innerHTML = dokumenData.length
    ? `<div class="home-mini-list">
        ${dokumenData
          .map(
            (item) => `
          <a href="${escapeHTML(item.link)}" target="_blank" rel="noopener" class="home-mini-item">
            <strong>${escapeHTML(item.judul)}</strong>
            <span>${escapeHTML(item.kategori || "Dokumen")}</span>
          </a>
        `,
          )
          .join("")}
      </div>`
    : `<div class="empty">Belum ada dokumen.</div>`;
}

function renderHomeFaq() {
  const list = document.getElementById("homeFaqList");
  if (!list) return;
  list.innerHTML = faqData.length
    ? `<div class="home-mini-list">
        ${faqData
          .map(
            (item) => `
          <a href="../pages/faq.html" class="home-mini-item">
            <strong>${escapeHTML(item.pertanyaan)}</strong>
            <span>${escapeHTML(item.kategori || "FAQ")}</span>
          </a>
        `,
          )
          .join("")}
      </div>`
    : `<div class="empty">Belum ada FAQ.</div>`;
}

function renderAll() {
  renderLatest();
  renderLatestJobs();
  renderHomeDokumen();
  renderHomeFaq();
  renderList("info", "infoList");
  renderList("wiki", "wikiList");
  renderList("job", "jobList");

  setText("countInfo", infoData.length);
  setText("countWiki", wikiData.length);
  setText("countJobs", jobData.length);
  setText("countJurusan", jurusanData.length);
  setText("countDokumen", dokumenData.length);
  setText("countFaq", faqData.length);
}

function getArtikelKategori(type, artikelId) {
  return artikelKategoriData
    .filter(
      (row) =>
        row.artikel_tipe === type &&
        String(row.artikel_id) === String(artikelId),
    )
    .map(
      (row) =>
        kategoriData.find((k) => String(k.id) === String(row.kategori_id))
          ?.nama,
    )
    .filter(Boolean);
}

function renderKategoriPills(type, artikelId) {
  const kategori = getArtikelKategori(type, artikelId);
  if (!kategori.length) return "";
  return kategori
    .map((item) => `<span class="pill">${escapeHTML(item)}</span>`)
    .join("");
}

function renderJurusanJobFilter() {
  const select = document.getElementById("jobJurusanFilter");
  if (!select) return;
  const currentValue = select.value || activeJobJurusan;
  select.innerHTML =
    `<option value="all">Semua Jurusan</option>` +
    jurusanData
      .map(
        (item) =>
          `<option value="${escapeHTML(item.id)}">${escapeHTML(item.nama)}</option>`,
      )
      .join("");
  select.value = currentValue;
  select.onchange = () => {
    activeJobJurusan = select.value;
    resetAndFetch("job");
  };
}

function resetAndFetch(type) {
  pageState[type].page = 0;
  pageState[type].hasMore = true;
  if (type === "info") infoData = [];
  if (type === "wiki") wikiData = [];
  if (type === "job") jobData = [];
  showLoading(`${type}List`, 3);
  fetchPaged(type, { append: false });
}

function loadMore(type) {
  if (!pageState[type].hasMore) return;
  pageState[type].page += 1;
  fetchPaged(type, { append: true });
}

function updateLoadMoreButtons() {
  ["info", "wiki", "job"].forEach((type) => {
    const button = document.getElementById(`${type}LoadMore`);
    if (!button) return;
    button.style.display = pageState[type].hasMore ? "inline-flex" : "none";
    button.disabled = !pageState[type].hasMore;
  });
}

function initLoadMoreButtons() {
  ["info", "wiki", "job"].forEach((type) => {
    const button = document.getElementById(`${type}LoadMore`);
    if (button) button.addEventListener("click", () => loadMore(type));
  });
}

function initSearchInputs() {
  const searchHandler = debounce((event) => {
    const id = event.target.id;
    const type = id.replace("Search", "");
    if (!TABLE_CONFIG[type]) return;
    pageState[type].keyword = event.target.value.trim();
    resetAndFetch(type);
  }, 350);

  ["infoSearch", "wikiSearch", "jobSearch"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("input", searchHandler);
  });
}

function initFilterButtons() {
  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-btn")
        .forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      activeFilter = button.dataset.filter || "all";
      renderAll();
    });
  });
}

function initLatestSlider() {
  const latestPrev = document.getElementById("latestPrev");
  const latestNext = document.getElementById("latestNext");
  const latestList = document.getElementById("latestList");
  if (!latestPrev || !latestNext || !latestList) return;

  latestPrev.addEventListener("click", () => {
    latestList.scrollBy({ left: -320, behavior: "smooth" });
  });
  latestNext.addEventListener("click", () => {
    latestList.scrollBy({ left: 320, behavior: "smooth" });
  });
}

async function loadHeroStats() {
  const cached = getCache("hero_stats_v1");
  if (cached) {
    setText("heroJurusanCount", cached.jurusan || 0);
    setText("heroWikiCount", cached.wiki || 0);
    setText("heroFaqCount", cached.faq || 0);
    setText("heroJobCount", cached.job || 0);
    return;
  }

  const [jurusanResult, wikiResult, faqResult, jobResult] = await Promise.all([
    supabaseClient.from("jurusan").select("id", { count: "exact", head: true }),
    supabaseClient
      .from("wiki_kampus")
      .select("id", { count: "exact", head: true }),
    supabaseClient
      .from("faq_kampus")
      .select("id", { count: "exact", head: true }),
    supabaseClient
      .from("lowongan_kerja")
      .select("id", { count: "exact", head: true }),
  ]);

  const stats = {
    jurusan: jurusanResult.count || 0,
    wiki: wikiResult.count || 0,
    faq: faqResult.count || 0,
    job: jobResult.count || 0,
  };

  setCache("hero_stats_v1", stats);

  setText("heroJurusanCount", stats.jurusan);
  setText("heroWikiCount", stats.wiki);
  setText("heroFaqCount", stats.faq);
  setText("heroJobCount", stats.job);
}

function initApp() {
  initSearchInputs();
  initFilterButtons();
  initLatestSlider();
  initLoadMoreButtons();

  loadHeroStats(); // tambah ini
  loadCoreData();
}

initApp();
