const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const HOME_LIMIT = 5;
const MINI_LIMIT = 4;

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

async function loadData() {
  showLoading("latestList", 3);
  showLoading("latestJobList", 3);
  showLoading("infoList", 3);
  showLoading("wikiList", 3);
  showSimpleLoading("homeDokumenList", "Memuat dokumen...");
  showSimpleLoading("homeFaqList", "Memuat FAQ...");

  const [
    infoResult,
    wikiResult,
    jobResult,
    dokumenResult,
    faqResult,
    kategoriResult,
    artikelKategoriResult,
    jurusanResult,
    artikelJurusanResult
  ] = await Promise.all([
    supabaseClient
      .from("informasi_kampus")
      .select("id, judul, kategori, isi, gambar, created_at")
      .order("created_at", { ascending: false })
      .limit(HOME_LIMIT),

    supabaseClient
      .from("wiki_kampus")
      .select("id, judul, kategori, isi, gambar, created_at")
      .order("created_at", { ascending: false })
      .limit(HOME_LIMIT),

    supabaseClient
      .from("lowongan_kerja")
      .select("id, posisi, perusahaan, lokasi, deskripsi, gambar, created_at")
      .order("created_at", { ascending: false })
      .limit(HOME_LIMIT),

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

    supabaseClient
      .from("kategori")
      .select("id, nama"),

    supabaseClient
      .from("artikel_kategori")
      .select("artikel_tipe, artikel_id, kategori_id"),

    supabaseClient
      .from("jurusan")
      .select("id, nama")
      .order("nama", { ascending: true }),

    supabaseClient
      .from("artikel_jurusan")
      .select("artikel_tipe, artikel_id, jurusan_id")
      .eq("artikel_tipe", "job")
  ]);

  const firstError = [
    infoResult.error,
    wikiResult.error,
    jobResult.error,
    dokumenResult.error,
    faqResult.error,
    kategoriResult.error,
    artikelKategoriResult.error,
    jurusanResult.error,
    artikelJurusanResult.error
  ].find(Boolean);

  if (firstError) {
    console.error("Gagal mengambil data:", firstError);
  }

  infoData = infoResult.data || [];
  wikiData = wikiResult.data || [];
  jobData = jobResult.data || [];
  dokumenData = dokumenResult.data || [];
  faqData = faqResult.data || [];
  kategoriData = kategoriResult.data || [];
  artikelKategoriData = artikelKategoriResult.data || [];
  jurusanData = jurusanResult.data || [];
  artikelJurusanData = artikelJurusanResult.data || [];

  renderJurusanJobFilter();
  renderAll();
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

function renderHomeDokumen() {
  const list = document.getElementById("homeDokumenList");
  if (!list) return;

  list.innerHTML = dokumenData.length
    ? `<div class="home-mini-list">
        ${dokumenData.map(item => `
          <a href="${escapeHTML(item.link)}" target="_blank" rel="noopener" class="home-mini-item">
            <strong>${escapeHTML(item.judul)}</strong>
            <span>${escapeHTML(item.kategori || "Dokumen")}</span>
          </a>
        `).join("")}
      </div>`
    : `<div class="empty">Belum ada dokumen.</div>`;
}

function renderHomeFaq() {
  const list = document.getElementById("homeFaqList");
  if (!list) return;

  list.innerHTML = faqData.length
    ? `<div class="home-mini-list">
        ${faqData.map(item => `
          <a href="faq.html" class="home-mini-item">
            <strong>${escapeHTML(item.pertanyaan)}</strong>
            <span>${escapeHTML(item.kategori || "FAQ")}</span>
          </a>
        `).join("")}
      </div>`
    : `<div class="empty">Belum ada FAQ.</div>`;
}

function createCard(type, item) {
  if (type === "info") {
    return `
      <article class="item-card">
        ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.judul)}" loading="lazy">` : ""}
        ${renderKategoriPills("info", item.id)}
        <h3>${escapeHTML(item.judul)}</h3>
        <p>${escapeHTML(makeExcerpt(item.isi))}</p>
        <a class="btn ghost" href="post.html?type=info&id=${encodeURIComponent(item.id)}">Baca Selengkapnya</a>
      </article>
    `;
  }

  if (type === "wiki") {
    return `
      <article class="item-card">
        ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.judul)}" loading="lazy">` : ""}
        ${renderKategoriPills("wiki", item.id) || `<span class="pill">${escapeHTML(item.kategori || "Wiki")}</span>`}
        <h3>${escapeHTML(item.judul)}</h3>
        <p>${escapeHTML(makeExcerpt(item.isi))}</p>
        <a class="btn ghost" href="post.html?type=wiki&id=${encodeURIComponent(item.id)}">Baca Selengkapnya</a>
      </article>
    `;
  }

  return `
    <article class="item-card">
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.posisi)}" loading="lazy">` : ""}
      <span class="pill">${escapeHTML(item.perusahaan)}</span>
      <span class="pill">${escapeHTML(item.lokasi || "Fleksibel")}</span>
      <h3>${escapeHTML(item.posisi)}</h3>
      <p>${escapeHTML(makeExcerpt(item.deskripsi))}</p>
      <a class="btn ghost" href="post.html?type=job&id=${encodeURIComponent(item.id)}">Lihat Detail</a>
    </article>
  `;
}

function createLatestCard(item) {
  return `
    <article class="item-card">
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.title)}" loading="lazy">` : ""}
      <span class="pill">${escapeHTML(item.label)}</span>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(makeExcerpt(item.content))}</p>
      <a class="btn ghost" href="post.html?type=${encodeURIComponent(item.type)}&id=${encodeURIComponent(item.id)}">
        Baca Selengkapnya
      </a>
    </article>
  `;
}

function getSearchText(type, item) {
  if (type === "info" || type === "wiki") {
    return `${item.judul || ""} ${item.kategori || ""} ${stripHTML(item.isi || "")}`.toLowerCase();
  }

  return `${item.posisi || ""} ${item.perusahaan || ""} ${item.lokasi || ""} ${stripHTML(item.deskripsi || "")}`.toLowerCase();
}

function renderList(type, listId, searchId, data) {
  const list = document.getElementById(listId);
  const search = document.getElementById(searchId);
  if (!list || !search) return;

  const keyword = search.value.trim().toLowerCase();

  const filtered = data.filter(item => {
    const matchSearch = !keyword || getSearchText(type, item).includes(keyword);

    let matchFilter = true;
    if (activeFilter !== "all") {
      if (type === "info" || type === "wiki") {
        const kategoriNames = getArtikelKategori(type, item.id).map(nama => nama.toLowerCase());
        matchFilter = kategoriNames.some(nama => nama.includes(activeFilter));
      }

      if (type === "job") {
        matchFilter = activeFilter === "lowongan";
      }
    }

    let matchJurusan = true;
    if (type === "job" && activeJobJurusan !== "all") {
      matchJurusan = artikelJurusanData.some(row =>
        row.artikel_tipe === "job" &&
        String(row.artikel_id) === String(item.id) &&
        String(row.jurusan_id) === String(activeJobJurusan)
      );
    }

    return matchSearch && matchFilter && matchJurusan;
  });

  list.innerHTML = filtered.length
    ? filtered.map(item => createCard(type, item)).join("")
    : `<div class="empty">Belum ada data.</div>`;
}

function renderLatest() {
  const latestList = document.getElementById("latestList");
  if (!latestList) return;

  const combined = [
    ...infoData.map(item => ({
      id: item.id,
      type: "info",
      title: item.judul || "",
      content: item.isi || "",
      gambar: item.gambar || "",
      label: getArtikelKategori("info", item.id)[0] || item.kategori || "Info Kampus",
      created_at: item.created_at || ""
    })),
    ...wikiData.map(item => ({
      id: item.id,
      type: "wiki",
      title: item.judul || "",
      content: item.isi || "",
      gambar: item.gambar || "",
      label: getArtikelKategori("wiki", item.id)[0] || item.kategori || "Wiki Kampus",
      created_at: item.created_at || ""
    })),
    ...jobData.map(item => ({
      id: item.id,
      type: "job",
      title: item.posisi || "",
      content: item.deskripsi || "",
      gambar: item.gambar || "",
      label: item.perusahaan || "Lowongan",
      created_at: item.created_at || ""
    }))
  ];

  const latest = combined
    .filter(item => item.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, HOME_LIMIT);

  latestList.innerHTML = latest.length
    ? latest.map(item => createLatestCard(item)).join("")
    : `<div class="empty">Belum ada artikel terbaru.</div>`;
}

function renderLatestJobs() {
  const list = document.getElementById("latestJobList");
  if (!list) return;

  const latestJobs = jobData.slice(0, HOME_LIMIT);

  list.innerHTML = latestJobs.length
    ? latestJobs.map(item => createCard("job", item)).join("")
    : `<div class="empty">Belum ada lowongan terbaru.</div>`;
}

function renderAll() {
  renderLatest();
  renderLatestJobs();
  renderHomeDokumen();
  renderHomeFaq();

  if (document.getElementById("infoList")) {
    renderList("info", "infoList", "infoSearch", infoData);
  }

  if (document.getElementById("wikiList")) {
    renderList("wiki", "wikiList", "wikiSearch", wikiData);
  }

  if (document.getElementById("jobList")) {
    renderList("job", "jobList", "jobSearch", jobData);
  }

  setText("countInfo", infoData.length);
  setText("countWiki", wikiData.length);
  setText("countJobs", jobData.length);
  setText("countJurusan", jurusanData.length);
  setText("countDokumen", dokumenData.length);
  setText("countFaq", faqData.length);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function initSearchInputs() {
  const rerender = debounce(renderAll, 200);
  ["infoSearch", "wikiSearch", "jobSearch"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("input", rerender);
  });
}

function initFilterButtons() {
  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
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

function getArtikelKategori(type, artikelId) {
  return artikelKategoriData
    .filter(row => row.artikel_tipe === type && String(row.artikel_id) === String(artikelId))
    .map(row => kategoriData.find(k => String(k.id) === String(row.kategori_id))?.nama)
    .filter(Boolean);
}

function renderKategoriPills(type, artikelId) {
  const kategori = getArtikelKategori(type, artikelId);
  if (!kategori.length) return "";

  return kategori
    .map(item => `<span class="pill">${escapeHTML(item)}</span>`)
    .join("");
}

function renderJurusanJobFilter() {
  const select = document.getElementById("jobJurusanFilter");
  if (!select) return;

  const currentValue = select.value || activeJobJurusan;
  select.innerHTML =
    `<option value="all">Semua Jurusan</option>` +
    jurusanData.map(item => `<option value="${escapeHTML(item.id)}">${escapeHTML(item.nama)}</option>`).join("");

  select.value = currentValue;
  select.onchange = () => {
    activeJobJurusan = select.value;
    renderAll();
  };
}

initSearchInputs();
initFilterButtons();
initLatestSlider();
loadData();
