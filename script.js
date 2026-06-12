const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", () => {
  navMenu.classList.toggle("show");
});

let infoData = [];
let wikiData = [];
let jobData = [];

async function loadData() {
  const { data: info } = await supabaseClient
    .from("informasi_kampus")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: wiki } = await supabaseClient
    .from("wiki_kampus")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: job } = await supabaseClient
    .from("lowongan_kerja")
    .select("*")
    .order("created_at", { ascending: false });

  infoData = info || [];
  wikiData = wiki || [];
  jobData = job || [];

  renderAll();
}

function createCard(type, item) {
  if (type === "info") {
    return `
      <article class="item-card">
        <div class="meta"><span class="pill">${item.kategori || "-"}</span></div>
        <h3>${item.judul}</h3>
        <p>${item.isi}</p>
        <div class="card-actions">
          <button class="btn ghost" onclick="editInfo(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteItem('info', ${item.id})">Hapus</button>
        </div>
      </article>`;
  }

  if (type === "wiki") {
    return `
      <article class="item-card">
        <div class="meta"><span class="pill">${item.kategori || "-"}</span></div>
        <h3>${item.judul}</h3>
        <p>${item.isi}</p>
        <div class="card-actions">
          <button class="btn ghost" onclick="editWiki(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteItem('wiki', ${item.id})">Hapus</button>
        </div>
      </article>`;
  }

  return `
    <article class="item-card">
      <div class="meta">
        <span class="pill">${item.perusahaan}</span>
        <span class="pill">${item.lokasi || "-"}</span>
      </div>
      <h3>${item.posisi}</h3>
      <p>${item.deskripsi || ""}</p>
      ${item.link ? `<a href="${item.link}" target="_blank" class="btn ghost">Lihat Link</a>` : ""}
      <div class="card-actions">
        <button class="btn ghost" onclick="editJob(${item.id})">Edit</button>
        <button class="btn danger" onclick="deleteItem('job', ${item.id})">Hapus</button>
      </div>
    </article>`;
}

function renderList(type, listId, searchId) {
  const keyword = document.getElementById(searchId).value.toLowerCase();

  let data = [];
  if (type === "info") data = infoData;
  if (type === "wiki") data = wikiData;
  if (type === "job") data = jobData;

  const filtered = data.filter(item =>
    JSON.stringify(item).toLowerCase().includes(keyword)
  );

  document.getElementById(listId).innerHTML = filtered.length
    ? filtered.map(item => createCard(type, item)).join("")
    : '<div class="empty">Belum ada data atau hasil pencarian tidak ditemukan.</div>';
}

function renderAll() {
  renderList("info", "infoList", "infoSearch");
  renderList("wiki", "wikiList", "wikiSearch");
  renderList("job", "jobList", "jobSearch");

  document.getElementById("countInfo").textContent = infoData.length;
  document.getElementById("countWiki").textContent = wikiData.length;
  document.getElementById("countJobs").textContent = jobData.length;
}

async function upsertInfo() {
  const id = infoId.value;

  const payload = {
    judul: infoTitle.value,
    kategori: infoCategory.value,
    isi: infoContent.value
  };

  if (id) {
    await supabaseClient.from("informasi_kampus").update(payload).eq("id", id);
  } else {
    await supabaseClient.from("informasi_kampus").insert(payload);
  }

  clearForm("info");
  loadData();
}

async function upsertWiki() {
  const id = wikiId.value;

  const payload = {
    judul: wikiTitle.value,
    kategori: wikiTag.value,
    isi: wikiContent.value
  };

  if (id) {
    await supabaseClient.from("wiki_kampus").update(payload).eq("id", id);
  } else {
    await supabaseClient.from("wiki_kampus").insert(payload);
  }

  clearForm("wiki");
  loadData();
}

async function upsertJob() {
  const id = jobId.value;

  const payload = {
    posisi: jobTitle.value,
    perusahaan: jobCompany.value,
    lokasi: jobLocation.value,
    deskripsi: jobContent.value,
    link: ""
  };

  if (id) {
    await supabaseClient.from("lowongan_kerja").update(payload).eq("id", id);
  } else {
    await supabaseClient.from("lowongan_kerja").insert(payload);
  }

  clearForm("job");
  loadData();
}

async function deleteItem(type, id) {
  if (!confirm("Yakin ingin menghapus data ini?")) return;

  if (type === "info") {
    await supabaseClient.from("informasi_kampus").delete().eq("id", id);
  }

  if (type === "wiki") {
    await supabaseClient.from("wiki_kampus").delete().eq("id", id);
  }

  if (type === "job") {
    await supabaseClient.from("lowongan_kerja").delete().eq("id", id);
  }

  loadData();
}

function clearForm(type) {
  document.getElementById(`${type}Form`).reset();
  document.getElementById(`${type}Id`).value = "";
}

function editInfo(id) {
  const item = infoData.find(row => row.id === id);

  infoId.value = item.id;
  infoTitle.value = item.judul;
  infoCategory.value = item.kategori;
  infoContent.value = item.isi;

  location.hash = "#kampus";
}

function editWiki(id) {
  const item = wikiData.find(row => row.id === id);

  wikiId.value = item.id;
  wikiTitle.value = item.judul;
  wikiTag.value = item.kategori;
  wikiContent.value = item.isi;

  location.hash = "#wiki";
}

function editJob(id) {
  const item = jobData.find(row => row.id === id);

  jobId.value = item.id;
  jobTitle.value = item.posisi;
  jobCompany.value = item.perusahaan;
  jobLocation.value = item.lokasi;
  jobContent.value = item.deskripsi;

  location.hash = "#lowongan";
}

document.getElementById("infoForm").addEventListener("submit", event => {
  event.preventDefault();
  upsertInfo();
});

document.getElementById("wikiForm").addEventListener("submit", event => {
  event.preventDefault();
  upsertWiki();
});

document.getElementById("jobForm").addEventListener("submit", event => {
  event.preventDefault();
  upsertJob();
});

["infoSearch", "wikiSearch", "jobSearch"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderAll);
});

const resetBtn = document.getElementById("resetDataBtn");
if (resetBtn) {
  resetBtn.style.display = "none";
}

loadData();
