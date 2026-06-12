const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");
menuToggle.addEventListener("click", () => navMenu.classList.toggle("show"));

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
    return `<article class="item-card"><span class="pill">${escapeHTML(item.kategori || "Umum")}</span><h3>${escapeHTML(item.judul)}</h3><p>${escapeHTML(item.isi)}</p></article>`;
  }
  if (type === "wiki") {
    return `<article class="item-card"><span class="pill">${escapeHTML(item.kategori || "Wiki")}</span><h3>${escapeHTML(item.judul)}</h3><p>${escapeHTML(item.isi)}</p></article>`;
  }
  return `<article class="item-card"><span class="pill">${escapeHTML(item.perusahaan)}</span><span class="pill">${escapeHTML(item.lokasi || "Fleksibel")}</span><h3>${escapeHTML(item.posisi)}</h3><p>${escapeHTML(item.deskripsi)}</p>${item.link ? `<a class="btn ghost" href="${escapeHTML(item.link)}" target="_blank">Buka Link</a>` : ""}</article>`;
}

function renderList(type, listId, searchId, data) {
  const keyword = document.getElementById(searchId).value.toLowerCase();
  const filtered = data.filter(item => JSON.stringify(item).toLowerCase().includes(keyword));
  document.getElementById(listId).innerHTML = filtered.length ? filtered.map(item => createCard(type, item)).join("") : '<div class="empty">Belum ada data.</div>';
}

function renderAll() {
  renderList("info", "infoList", "infoSearch", infoData);
  renderList("wiki", "wikiList", "wikiSearch", wikiData);
  renderList("job", "jobList", "jobSearch", jobData);
  document.getElementById("countInfo").textContent = infoData.length;
  document.getElementById("countWiki").textContent = wikiData.length;
  document.getElementById("countJobs").textContent = jobData.length;
}

["infoSearch", "wikiSearch", "jobSearch"].forEach(id => document.getElementById(id).addEventListener("input", renderAll));
loadData();
