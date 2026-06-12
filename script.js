const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");
menuToggle.addEventListener("click", () => navMenu.classList.toggle("show"));

let activeFilter = "all";
let infoData = [];
let wikiData = [];
let jobData = [];

async function loadData() {
  const { data: info, error: infoError } = await supabaseClient.from("informasi_kampus").select("*").order("created_at", { ascending: false });
  const { data: wiki, error: wikiError } = await supabaseClient.from("wiki_kampus").select("*").order("created_at", { ascending: false });
  const { data: jobs, error: jobError } = await supabaseClient.from("lowongan_kerja").select("*").order("created_at", { ascending: false });

  if (infoError || wikiError || jobError) {
    console.error("Gagal mengambil data:", infoError || wikiError || jobError);
  }

  infoData = info || [];
  wikiData = wiki || [];
  jobData = jobs || [];
  renderAll();
}

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
}

function createCard(type, item) {
  if (type === "info") {
    return `
      <article class="item-card">
        ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.judul)}">` : ""}
        <span class="pill">${escapeHTML(item.kategori || "Umum")}</span>
        <h3>${escapeHTML(item.judul)}</h3>
        <p>${escapeHTML(item.isi).slice(0, 120)}...</p>
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
        <p>${escapeHTML(item.isi).slice(0, 120)}...</p>
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
      <p>${escapeHTML(item.deskripsi).slice(0, 120)}...</p>
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

    let categoryText = "";

    if (type === "info" || type === "wiki") {
      categoryText = item.kategori || "";
    }

    if (type === "job") {
      categoryText = "lowongan";
    }

    const matchFilter =
      activeFilter === "all" ||
      categoryText.toLowerCase().includes(activeFilter);

    return matchSearch && matchFilter;
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
      title: item.judul,
      content: item.isi,
      gambar: item.gambar,
      label: item.kategori || "Info Kampus",
      created_at: item.created_at
    })),

    ...wikiData.map(item => ({
      id: item.id,
      type: "wiki",
      title: item.judul,
      content: item.isi,
      gambar: item.gambar,
      label: item.kategori || "Wiki Kampus",
      created_at: item.created_at
    })),

    ...jobData.map(item => ({
      id: item.id,
      type: "job",
      title: item.posisi,
      content: item.deskripsi,
      gambar: item.gambar,
      label: item.perusahaan || "Lowongan",
      created_at: item.created_at
    }))
  ];

  const latest = combined
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);

  latestList.innerHTML = latest.length
    ? latest.map(item => createLatestCard(item)).join("")
    : '<div class="empty">Belum ada artikel terbaru.</div>';
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

["infoSearch", "wikiSearch", "jobSearch"].forEach(id =>
  document.getElementById(id).addEventListener("input", renderAll)
);

/* FILTER KATEGORI */

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


loadData();
