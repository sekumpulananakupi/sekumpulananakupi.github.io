const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

if (menuToggle && navMenu) {
  menuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("show");
  });
}

let isAdmin = false;
let infoData = [];
let wikiData = [];
let jobData = [];

/* =========================
   LOGIN ADMIN
========================= */

async function checkSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Session error:", error);
    return;
  }

  isAdmin = !!data.session;
  updateAdminUI();

  if (isAdmin) {
    await loadData();
  }
}

function updateAdminUI() {
  const adminPanel = document.getElementById("adminPanel");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginStatus = document.getElementById("loginStatus");

  adminPanel.style.display = isAdmin ? "block" : "none";
  loginBtn.style.display = isAdmin ? "none" : "inline-block";
  logoutBtn.style.display = isAdmin ? "inline-block" : "none";

  loginStatus.textContent = isAdmin
    ? "Login berhasil. Mode admin aktif."
    : "Belum login.";
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  if (!email || !password) {
    alert("Email dan password wajib diisi.");
    return;
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Login error:", error);
    alert("Login gagal: " + error.message);
    return;
  }

  isAdmin = true;
  updateAdminUI();
  await loadData();

  console.log("Login berhasil:", data);
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();

  isAdmin = false;
  updateAdminUI();

  infoData = [];
  wikiData = [];
  jobData = [];

  renderAll();
});

/* =========================
   LOAD DATA
========================= */

async function loadData() {
  const { data: info, error: infoError } = await supabaseClient
    .from("informasi_kampus")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: wiki, error: wikiError } = await supabaseClient
    .from("wiki_kampus")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: job, error: jobError } = await supabaseClient
    .from("lowongan_kerja")
    .select("*")
    .order("created_at", { ascending: false });

  if (infoError) console.error("Info error:", infoError);
  if (wikiError) console.error("Wiki error:", wikiError);
  if (jobError) console.error("Job error:", jobError);

  infoData = info || [];
  wikiData = wiki || [];
  jobData = job || [];

  renderAll();
}

/* =========================
   RENDER DATA
========================= */

function createCard(type, item) {
  if (type === "info") {
    return `
      <article class="item-card">
        <div class="meta">
          <span class="pill">${item.kategori || "-"}</span>
        </div>
        <h3>${item.judul}</h3>
        <p>${item.isi}</p>
        <div class="card-actions">
          <button class="btn ghost" onclick="editInfo(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteItem('info', ${item.id})">Hapus</button>
        </div>
      </article>
    `;
  }

  if (type === "wiki") {
    return `
      <article class="item-card">
        <div class="meta">
          <span class="pill">${item.kategori || "-"}</span>
        </div>
        <h3>${item.judul}</h3>
        <p>${item.isi}</p>
        <div class="card-actions">
          <button class="btn ghost" onclick="editWiki(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteItem('wiki', ${item.id})">Hapus</button>
        </div>
      </article>
    `;
  }

  return `
    <article class="item-card">
      <div class="meta">
        <span class="pill">${item.perusahaan || "-"}</span>
        <span class="pill">${item.lokasi || "-"}</span>
      </div>
      <h3>${item.posisi}</h3>
      <p>${item.deskripsi || ""}</p>
      ${
        item.link
          ? `<a href="${item.link}" target="_blank" class="btn ghost">Buka Link</a>`
          : ""
      }
      <div class="card-actions">
        <button class="btn ghost" onclick="editJob(${item.id})">Edit</button>
        <button class="btn danger" onclick="deleteItem('job', ${item.id})">Hapus</button>
      </div>
    </article>
  `;
}

function renderList(type, listId, searchId) {
  const searchInput = document.getElementById(searchId);
  const keyword = searchInput ? searchInput.value.toLowerCase() : "";

  let data = [];

  if (type === "info") data = infoData;
  if (type === "wiki") data = wikiData;
  if (type === "job") data = jobData;

  const filtered = data.filter(item =>
    JSON.stringify(item).toLowerCase().includes(keyword)
  );

  document.getElementById(listId).innerHTML = filtered.length
    ? filtered.map(item => createCard(type, item)).join("")
    : `<div class="empty">Belum ada data.</div>`;
}

function renderAll() {
  const infoList = document.getElementById("infoList");
  const wikiList = document.getElementById("wikiList");
  const jobList = document.getElementById("jobList");

  if (infoList) renderList("info", "infoList", "infoSearch");
  if (wikiList) renderList("wiki", "wikiList", "wikiSearch");
  if (jobList) renderList("job", "jobList", "jobSearch");
}

/* =========================
   CRUD INFO KAMPUS
========================= */

document.getElementById("infoForm").addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("infoId").value;

  const payload = {
    judul: document.getElementById("infoTitle").value,
    kategori: document.getElementById("infoCategory").value,
    isi: document.getElementById("infoContent").value
  };

  let response;

  if (id) {
    response = await supabaseClient
      .from("informasi_kampus")
      .update(payload)
      .eq("id", id);
  } else {
    response = await supabaseClient
      .from("informasi_kampus")
      .insert(payload);
  }

  if (response.error) {
    alert("Gagal menyimpan info kampus: " + response.error.message);
    return;
  }

  clearForm("info");
  await loadData();
});

/* =========================
   CRUD WIKI
========================= */

document.getElementById("wikiForm").addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("wikiId").value;

  const payload = {
    judul: document.getElementById("wikiTitle").value,
    kategori: document.getElementById("wikiTag").value,
    isi: document.getElementById("wikiContent").value
  };

  let response;

  if (id) {
    response = await supabaseClient
      .from("wiki_kampus")
      .update(payload)
      .eq("id", id);
  } else {
    response = await supabaseClient
      .from("wiki_kampus")
      .insert(payload);
  }

  if (response.error) {
    alert("Gagal menyimpan wiki: " + response.error.message);
    return;
  }

  clearForm("wiki");
  await loadData();
});

/* =========================
   CRUD LOWONGAN
========================= */

document.getElementById("jobForm").addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("jobId").value;

  const payload = {
    posisi: document.getElementById("jobTitle").value,
    perusahaan: document.getElementById("jobCompany").value,
    lokasi: document.getElementById("jobLocation").value,
    link: document.getElementById("jobLink").value,
    deskripsi: document.getElementById("jobContent").value
  };

  let response;

  if (id) {
    response = await supabaseClient
      .from("lowongan_kerja")
      .update(payload)
      .eq("id", id);
  } else {
    response = await supabaseClient
      .from("lowongan_kerja")
      .insert(payload);
  }

  if (response.error) {
    alert("Gagal menyimpan lowongan: " + response.error.message);
    return;
  }

  clearForm("job");
  await loadData();
});

/* =========================
   EDIT DATA
========================= */

function editInfo(id) {
  const item = infoData.find(row => row.id === id);
  if (!item) return;

  document.getElementById("infoId").value = item.id;
  document.getElementById("infoTitle").value = item.judul;
  document.getElementById("infoCategory").value = item.kategori || "";
  document.getElementById("infoContent").value = item.isi;

  location.hash = "#kampus";
}

function editWiki(id) {
  const item = wikiData.find(row => row.id === id);
  if (!item) return;

  document.getElementById("wikiId").value = item.id;
  document.getElementById("wikiTitle").value = item.judul;
  document.getElementById("wikiTag").value = item.kategori || "";
  document.getElementById("wikiContent").value = item.isi;

  location.hash = "#wiki";
}

function editJob(id) {
  const item = jobData.find(row => row.id === id);
  if (!item) return;

  document.getElementById("jobId").value = item.id;
  document.getElementById("jobTitle").value = item.posisi;
  document.getElementById("jobCompany").value = item.perusahaan;
  document.getElementById("jobLocation").value = item.lokasi || "";
  document.getElementById("jobLink").value = item.link || "";
  document.getElementById("jobContent").value = item.deskripsi || "";

  location.hash = "#lowongan";
}

/* =========================
   DELETE DATA
========================= */

async function deleteItem(type, id) {
  if (!confirm("Yakin ingin menghapus data ini?")) return;

  let response;

  if (type === "info") {
    response = await supabaseClient
      .from("informasi_kampus")
      .delete()
      .eq("id", id);
  }

  if (type === "wiki") {
    response = await supabaseClient
      .from("wiki_kampus")
      .delete()
      .eq("id", id);
  }

  if (type === "job") {
    response = await supabaseClient
      .from("lowongan_kerja")
      .delete()
      .eq("id", id);
  }

  if (response.error) {
    alert("Gagal menghapus data: " + response.error.message);
    return;
  }

  await loadData();
}

/* =========================
   CLEAR FORM
========================= */

function clearForm(type) {
  document.getElementById(`${type}Form`).reset();
  document.getElementById(`${type}Id`).value = "";
}

/* =========================
   SEARCH
========================= */

["infoSearch", "wikiSearch", "jobSearch"].forEach(id => {
  const input = document.getElementById(id);

  if (input) {
    input.addEventListener("input", renderAll);
  }
});

/* =========================
   START
========================= */

checkSession();
