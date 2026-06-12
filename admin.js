const SUPABASE_URL = "ISI_PROJECT_URL_SUPABASE_KAMU";
const SUPABASE_KEY = "ISI_PUBLISHABLE_KEY_SUPABASE_KAMU";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");
menuToggle.addEventListener("click", () => navMenu.classList.toggle("show"));

let infoData = [];
let wikiData = [];
let jobData = [];
let isAdmin = false;

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[char]));
}

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  isAdmin = !!data.session;
  updateUI();
  if (isAdmin) loadData();
}

function updateUI() {
  document.getElementById("loginBox").style.display = isAdmin ? "none" : "block";
  document.getElementById("adminToolbar").style.display = isAdmin ? "flex" : "none";
  document.querySelectorAll(".admin-section").forEach(section => section.style.display = isAdmin ? "block" : "none");
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return document.getElementById("loginStatus").textContent = "Login gagal: " + error.message;
  isAdmin = true;
  updateUI();
  loadData();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  isAdmin = false;
  updateUI();
});

async function loadData() {
  const { data: info } = await supabaseClient.from("informasi_kampus").select("*").order("created_at", { ascending: false });
  const { data: wiki } = await supabaseClient.from("wiki_kampus").select("*").order("created_at", { ascending: false });
  const { data: jobs } = await supabaseClient.from("lowongan_kerja").select("*").order("created_at", { ascending: false });
  infoData = info || [];
  wikiData = wiki || [];
  jobData = jobs || [];
  renderAll();
}

function createCard(type, item) {
  if (type === "info") return `<article class="item-card"><span class="pill">${escapeHTML(item.kategori)}</span><h3>${escapeHTML(item.judul)}</h3><p>${escapeHTML(item.isi)}</p><div class="card-actions"><button class="btn ghost" onclick="editInfo(${item.id})">Edit</button><button class="btn danger" onclick="deleteItem('info', ${item.id})">Hapus</button></div></article>`;
  if (type === "wiki") return `<article class="item-card"><span class="pill">${escapeHTML(item.kategori)}</span><h3>${escapeHTML(item.judul)}</h3><p>${escapeHTML(item.isi)}</p><div class="card-actions"><button class="btn ghost" onclick="editWiki(${item.id})">Edit</button><button class="btn danger" onclick="deleteItem('wiki', ${item.id})">Hapus</button></div></article>`;
  return `<article class="item-card"><span class="pill">${escapeHTML(item.perusahaan)}</span><span class="pill">${escapeHTML(item.lokasi)}</span><h3>${escapeHTML(item.posisi)}</h3><p>${escapeHTML(item.deskripsi)}</p>${item.link ? `<a class="btn ghost" href="${escapeHTML(item.link)}" target="_blank">Buka Link</a>` : ""}<div class="card-actions"><button class="btn ghost" onclick="editJob(${item.id})">Edit</button><button class="btn danger" onclick="deleteItem('job', ${item.id})">Hapus</button></div></article>`;
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
}

async function deleteItem(type, id) {
  if (!confirm("Yakin ingin menghapus data ini?")) return;
  const table = type === "info" ? "informasi_kampus" : type === "wiki" ? "wiki_kampus" : "lowongan_kerja";
  await supabaseClient.from(table).delete().eq("id", id);
  loadData();
}

function clearForm(type) {
  document.getElementById(`${type}Form`).reset();
  document.getElementById(`${type}Id`).value = "";
}

function editInfo(id) {
  const item = infoData.find(row => row.id === id);
  infoId.value = item.id; infoTitle.value = item.judul; infoCategory.value = item.kategori; infoContent.value = item.isi;
  location.hash = "#kampus";
}
function editWiki(id) {
  const item = wikiData.find(row => row.id === id);
  wikiId.value = item.id; wikiTitle.value = item.judul; wikiTag.value = item.kategori; wikiContent.value = item.isi;
  location.hash = "#wiki";
}
function editJob(id) {
  const item = jobData.find(row => row.id === id);
  jobId.value = item.id; jobTitle.value = item.posisi; jobCompany.value = item.perusahaan; jobLocation.value = item.lokasi || ""; jobLink.value = item.link || ""; jobContent.value = item.deskripsi || "";
  location.hash = "#lowongan";
}

document.getElementById("infoForm").addEventListener("submit", async event => {
  event.preventDefault();
  const id = infoId.value;
  const payload = { judul: infoTitle.value, kategori: infoCategory.value, isi: infoContent.value };
  if (id) await supabaseClient.from("informasi_kampus").update(payload).eq("id", id);
  else await supabaseClient.from("informasi_kampus").insert(payload);
  clearForm("info"); loadData();
});

document.getElementById("wikiForm").addEventListener("submit", async event => {
  event.preventDefault();
  const id = wikiId.value;
  const payload = { judul: wikiTitle.value, kategori: wikiTag.value, isi: wikiContent.value };
  if (id) await supabaseClient.from("wiki_kampus").update(payload).eq("id", id);
  else await supabaseClient.from("wiki_kampus").insert(payload);
  clearForm("wiki"); loadData();
});

document.getElementById("jobForm").addEventListener("submit", async event => {
  event.preventDefault();
  const id = jobId.value;
  const payload = { posisi: jobTitle.value, perusahaan: jobCompany.value, lokasi: jobLocation.value, link: jobLink.value, deskripsi: jobContent.value };
  if (id) await supabaseClient.from("lowongan_kerja").update(payload).eq("id", id);
  else await supabaseClient.from("lowongan_kerja").insert(payload);
  clearForm("job"); loadData();
});

["infoSearch", "wikiSearch", "jobSearch"].forEach(id => document.getElementById(id).addEventListener("input", renderAll));
checkSession();
