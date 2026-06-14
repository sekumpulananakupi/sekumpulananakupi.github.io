const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


let activeFilter = "all";
let infoData = [];
let wikiData = [];
let jobData = [];
let kategoriData = [];
let artikelKategoriData = [];
let jurusanData = [];
let artikelJurusanData = [];
let dokumenData = [];
let faqData = [];
let activeJobJurusan = "all";

async function loadData() {
showLoading("latestList", 3);
showLoading("latestJobList", 3);
showLoading("infoList", 3);
showLoading("wikiList", 3);
showSimpleLoading("homeDokumenList", "Memuat dokumen...");
showSimpleLoading("homeFaqList", "Memuat FAQ...");
  const { data: info, error: infoError } = await supabaseClient.from("informasi_kampus").select("*").order("created_at", { ascending: false });
  const { data: wiki, error: wikiError } = await supabaseClient.from("wiki_kampus").select("*").order("created_at", { ascending: false });
  const { data: jobs, error: jobError } = await supabaseClient.from("lowongan_kerja").select("*").order("created_at", { ascending: false });
  const { data: dokumen } = await supabaseClient.from("dokumen_kampus").select("*").order("created_at", { ascending: false }).limit(4);
  const { data: faq } = await supabaseClient.from("faq_kampus").select("*").order("created_at", { ascending: false }).limit(4);
  const { data: kategori } = await supabaseClient.from("kategori").select("*");
  const { data: artikelKategori } = await supabaseClient.from("artikel_kategori").select("*");
  const { data: jurusan } = await supabaseClient.from("jurusan").select("*").order("nama", { ascending: true });
  const { data: artikelJurusan } = await supabaseClient.from("artikel_jurusan").select("*");
  
  
  if (infoError || wikiError || jobError) {
    console.error("Gagal mengambil data:", infoError || wikiError || jobError);
  }

  infoData = info || [];
  wikiData = wiki || [];
  jobData = jobs || [];
  kategoriData = kategori || [];
  artikelKategoriData = artikelKategori || [];
  jurusanData = jurusan || [];
  artikelJurusanData = artikelJurusan || [];
  dokumenData = dokumen || [];
  faqData = faq || [];

  renderJurusanJobFilter();
  renderFilterButtons();
  renderHomeDokumen();
  renderHomeFaq();
  renderAll();
}

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
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
      ${message}
    </div>
  `;
}

function renderHomeDokumen() {
  const list = document.getElementById("homeDokumenList");
  if (!list) return;

  list.innerHTML = dokumenData.length
    ? `<div class="home-mini-list">
        ${dokumenData.map(item => `
          <a href="${escapeHTML(item.link)}" target="_blank" class="home-mini-item">
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
        ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.judul)}">` : ""}
        ${renderKategoriPills("info", item.id)}
        <h3>${escapeHTML(item.judul)}</h3>
        <p>${escapeHTML(stripHTML(item.isi)).slice(0, 120)}...</p>
        <a class="btn ghost" href="post.html?type=info&id=${item.id}">Baca Selengkapnya</a>
      </article>
    `;
  }

  if (type === "wiki") {
    return `
      <article class="item-card">
        ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.judul)}">` : ""}
        <span class="pill">${escapeHTML(item.kategori || "Wiki")}</span>
        <h3>${escapeHTML(item.judul)}</h3>
        <p>${escapeHTML(stripHTML(item.isi)).slice(0, 120)}...</p>
        <a class="btn ghost" href="post.html?type=wiki&id=${item.id}">Baca Selengkapnya</a>
      </article>
    `;
  }

  return `
    <article class="item-card">
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.posisi)}">` : ""}
      <span class="pill">${escapeHTML(item.perusahaan)}</span>
      <span class="pill">${escapeHTML(item.lokasi || "Fleksibel")}</span>
      <h3>${escapeHTML(item.posisi)}</h3>
      <p>${escapeHTML(stripHTML(item.deskripsi)).slice(0, 120)}...</p>
      <a class="btn ghost" href="post.html?type=job&id=${item.id}">Lihat Detail</a>
    </article>
  `;
}

function createLatestCard(item) {
  return `
    <article class="item-card">
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.title)}">` : ""}

      <span class="pill">${escapeHTML(item.label)}</span>

      <h3>${escapeHTML(item.title)}</h3>

      <p>${escapeHTML(item.content).slice(0, 120)}...</p>

      <a class="btn ghost" href="post.html?type=${item.type}&id=${item.id}">
        Baca Selengkapnya
      </a>
    </article>
  `;
}

function renderList(type, listId, searchId, data) {
  const keyword = document.getElementById(searchId).value.toLowerCase();

  const filtered = data.filter(item => {
    const text = JSON.stringify(item).toLowerCase();
    const matchSearch = text.includes(keyword);

    let matchFilter = true;

    if (activeFilter !== "all") {
      if (type === "info" || type === "wiki") {
        const kategoriNames = getArtikelKategori(type, item.id)
          .map(nama => nama.toLowerCase());

        matchFilter = kategoriNames.some(nama =>
          nama.includes(activeFilter)
        );
      }

      if (type === "job") {
        matchFilter = activeFilter === "lowongan";
      }
    }

let matchJurusan = true;

if (type === "job" && activeJobJurusan !== "all") {
  matchJurusan = artikelJurusanData.some(row =>
    row.artikel_tipe === "job" &&
    row.artikel_id === item.id &&
    String(row.jurusan_id) === String(activeJobJurusan)
  );
}
    
    return matchSearch && matchFilter && matchJurusan;
  });

  document.getElementById(listId).innerHTML = filtered.length
    ? filtered.map(item => createCard(type, item)).join("")
    : '<div class="empty">Belum ada data.</div>';
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
      label: item.kategori || "Info Kampus",
      created_at: item.created_at || ""
    })),

    ...wikiData.map(item => ({
      id: item.id,
      type: "wiki",
      title: item.judul || "",
      content: item.isi || "",
      gambar: item.gambar || "",
      label: item.kategori || "Wiki Kampus",
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
    .slice(0, 6);

  latestList.innerHTML = latest.length
    ? latest.map(item => createLatestCard(item)).join("")
    : '<div class="empty">Belum ada artikel terbaru.</div>';
}

function renderAll() {
  if (typeof renderLatest === "function") renderLatest();
  if (typeof renderLatestJobs === "function") renderLatestJobs();
  if (typeof renderHomeDokumen === "function") renderHomeDokumen();
  if (typeof renderHomeFaq === "function") renderHomeFaq();

  if (document.getElementById("infoList")) {
    renderList("info", "infoList", "infoSearch", infoData);
  }

  if (document.getElementById("wikiList")) {
    renderList("wiki", "wikiList", "wikiSearch", wikiData);
  }

  if (document.getElementById("jobList")) {
    renderList("job", "jobList", "jobSearch", jobData);
  }

  if (document.getElementById("countInfo")) {
    document.getElementById("countInfo").textContent = infoData.length;
  }

  if (document.getElementById("countWiki")) {
    document.getElementById("countWiki").textContent = wikiData.length;
  }

  if (document.getElementById("countJobs")) {
    document.getElementById("countJobs").textContent = jobData.length;
  }

  if (document.getElementById("countJurusan")) {
    document.getElementById("countJurusan").textContent = jurusanData.length;
  }

  if (document.getElementById("countDokumen")) {
    document.getElementById("countDokumen").textContent = dokumenData.length;
  }

  if (document.getElementById("countFaq")) {
    document.getElementById("countFaq").textContent = faqData.length;
  }
}

["infoSearch", "wikiSearch", "jobSearch"].forEach(id => {
  const input = document.getElementById(id);
  if (input) input.addEventListener("input", renderAll);
});

/* FILTER KATEGORI */

function initFilterButtons() {
  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      activeFilter = button.dataset.filter;

      renderAll();
    });
  });
}

const latestPrev = document.getElementById("latestPrev");
const latestNext = document.getElementById("latestNext");
const latestList = document.getElementById("latestList");

if (latestPrev && latestNext && latestList) {
  latestPrev.addEventListener("click", () => {
    latestList.scrollBy({
      left: -320,
      behavior: "smooth"
    });
  });

  latestNext.addEventListener("click", () => {
    latestList.scrollBy({
      left: 320,
      behavior: "smooth"
    });
  });
}

function getArtikelKategori(type, artikelId) {
  return artikelKategoriData
    .filter(row => row.artikel_tipe === type && row.artikel_id === artikelId)
    .map(row => kategoriData.find(k => k.id === row.kategori_id)?.nama)
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

  select.innerHTML =
    `<option value="all">Semua Jurusan</option>` +
    jurusanData
      .map(item => `<option value="${item.id}">${escapeHTML(item.nama)}</option>`)
      .join("");

  select.addEventListener("change", () => {
    activeJobJurusan = select.value;
    renderAll();
  });
}

function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

function renderLatestJobs() {
  const list = document.getElementById("latestJobList");
  if (!list) return;

  const latestJobs = jobData.slice(0, 3);

  list.innerHTML = latestJobs.length
    ? latestJobs.map(item => createCard("job", item)).join("")
    : `<div class="empty">Belum ada lowongan terbaru.</div>`;
}

loadData();
