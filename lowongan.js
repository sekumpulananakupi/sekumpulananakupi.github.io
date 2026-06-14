const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let jobData = [];
let jurusanData = [];
let tagData = [];
let artikelJurusanData = [];
let artikelTagData = [];

let activeJurusan = "all";
let activeTag = "all";

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
  return (div.textContent || div.innerText || "").trim();
}

async function loadLowongan() {
  showLoading("jobList", 6);

  const { data: jobs } = await supabaseClient
    .from("lowongan_kerja")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: jurusan } = await supabaseClient
    .from("jurusan")
    .select("*")
    .order("nama", { ascending: true });

  const { data: tags } = await supabaseClient
    .from("tags")
    .select("*")
    .order("nama", { ascending: true });

  const { data: artikelJurusan } = await supabaseClient
    .from("artikel_jurusan")
    .select("*")
    .eq("artikel_tipe", "job");

  const { data: artikelTag } = await supabaseClient
    .from("artikel_tags")
    .select("*")
    .eq("artikel_tipe", "job");

  jobData = jobs || [];
  jurusanData = jurusan || [];
  tagData = tags || [];
  artikelJurusanData = artikelJurusan || [];
  artikelTagData = artikelTag || [];


  const params = new URLSearchParams(window.location.search);
const keyword = params.get("q");

if (keyword) {
  document.getElementById("jobSearch").value = keyword;
}
  
  renderFilters();
  renderJobs();
}

function renderFilters() {
  const jurusanFilter = document.getElementById("jurusanFilter");
  const tagFilter = document.getElementById("tagFilter");

  jurusanFilter.innerHTML =
    `<option value="all">Semua Jurusan</option>` +
    jurusanData
      .map(item => `<option value="${item.id}">${escapeHTML(item.nama)}</option>`)
      .join("");

  tagFilter.innerHTML =
    `<option value="all">Semua Tag</option>` +
    tagData
      .map(item => `<option value="${item.id}">${escapeHTML(item.nama)}</option>`)
      .join("");
}

function jobHasJurusan(jobId) {
  if (activeJurusan === "all") return true;

  return artikelJurusanData.some(row =>
    row.artikel_id === jobId &&
    String(row.jurusan_id) === String(activeJurusan)
  );
}

function jobHasTag(jobId) {
  if (activeTag === "all") return true;

  return artikelTagData.some(row =>
    row.artikel_id === jobId &&
    String(row.tag_id) === String(activeTag)
  );
}

function renderJobs() {
  const keyword = document.getElementById("jobSearch").value.toLowerCase();

  const filtered = jobData.filter(job => {
    const text = JSON.stringify(job).toLowerCase();

    return (
      text.includes(keyword) &&
      jobHasJurusan(job.id) &&
      jobHasTag(job.id)
    );
  });

if (filtered.length) {
  document.getElementById("jobList").innerHTML = filtered.map(createJobCard).join("");
} else {
  showEmpty(
    "jobList",
    "Lowongan tidak ditemukan",
    "Coba gunakan kata kunci, tag, atau jurusan lain.",
    "💼"
  );
}
}

function createJobCard(item) {
  return `
    <article class="item-card">
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(item.posisi)}">` : ""}

      <span class="pill">${escapeHTML(item.perusahaan || "Lowongan")}</span>
      <span class="pill">${escapeHTML(item.lokasi || "Fleksibel")}</span>

      <h3>${escapeHTML(item.posisi)}</h3>
      <p>${escapeHTML(stripHTML(item.deskripsi)).slice(0, 140)}...</p>

      <a href="post.html?type=job&id=${item.id}" class="btn ghost">Lihat Detail</a>
    </article>
  `;
}

document.getElementById("jobSearch").addEventListener("input", renderJobs);

document.getElementById("jurusanFilter").addEventListener("change", event => {
  activeJurusan = event.target.value;
  renderJobs();
});

document.getElementById("tagFilter").addEventListener("change", event => {
  activeTag = event.target.value;
  renderJobs();
});

loadLowongan();
