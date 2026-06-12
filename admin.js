const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
let kategoriData = [];
let tagData = [];
let jurusanData = [];

async function loadMasterData() {
  const { data: kategori } = await supabaseClient
    .from("kategori")
    .select("*")
    .order("nama", { ascending: true });

  const { data: tags } = await supabaseClient
    .from("tags")
    .select("*")
    .order("nama", { ascending: true });

  const { data: jurusan } = await supabaseClient
    .from("jurusan")
    .select("*")
    .order("nama", { ascending: true });

  kategoriData = kategori || [];
  tagData = tags || [];
  jurusanData = jurusan || [];

  fillMultiSelect("infoKategoriMulti", kategoriData);
  fillMultiSelect("wikiKategoriMulti", kategoriData);
  fillMultiSelect("jobKategoriMulti", kategoriData);

  fillMultiSelect("infoTagMulti", tagData);
  fillMultiSelect("wikiTagMulti", tagData);
  fillMultiSelect("jobTagMulti", tagData);

  fillMultiSelect("infoJurusanMulti", jurusanData);
  fillMultiSelect("wikiJurusanMulti", jurusanData);
  fillMultiSelect("jobJurusanMulti", jurusanData);
}

function fillMultiSelect(elementId, data) {
  const select = document.getElementById(elementId);
  if (!select) return;

  select.innerHTML = data
    .map(item => `<option value="${item.id}">${item.nama}</option>`)
    .join("");
}

function getSelectedValues(elementId) {
  const select = document.getElementById(elementId);
  if (!select) return [];

  return Array.from(select.selectedOptions).map(option => Number(option.value));
}

async function saveRelations(type, artikelId, kategoriIds, tagIds, jurusanIds) {
  await supabaseClient
    .from("artikel_kategori")
    .delete()
    .eq("artikel_tipe", type)
    .eq("artikel_id", artikelId);

  await supabaseClient
    .from("artikel_tags")
    .delete()
    .eq("artikel_tipe", type)
    .eq("artikel_id", artikelId);

  await supabaseClient
    .from("artikel_jurusan")
    .delete()
    .eq("artikel_tipe", type)
    .eq("artikel_id", artikelId);

  if (kategoriIds.length) {
    await supabaseClient.from("artikel_kategori").insert(
      kategoriIds.map(id => ({
        artikel_tipe: type,
        artikel_id: artikelId,
        kategori_id: id
      }))
    );
  }

  if (tagIds.length) {
    await supabaseClient.from("artikel_tags").insert(
      tagIds.map(id => ({
        artikel_tipe: type,
        artikel_id: artikelId,
        tag_id: id
      }))
    );
  }

  if (jurusanIds.length) {
    await supabaseClient.from("artikel_jurusan").insert(
      jurusanIds.map(id => ({
        artikel_tipe: type,
        artikel_id: artikelId,
        jurusan_id: id
      }))
    );
  }
}


/* LOGIN */

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();

  isAdmin = !!data.session;
  updateAdminUI();

  if (isAdmin) {
    await loadMasterData();
    await loadData();
  }
}

function updateAdminUI() {
  document.getElementById("adminPanel").style.display = isAdmin ? "block" : "none";
  document.getElementById("loginBtn").style.display = isAdmin ? "none" : "inline-block";
  document.getElementById("logoutBtn").style.display = isAdmin ? "inline-block" : "none";

  document.getElementById("loginStatus").textContent = isAdmin
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

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("Login gagal: " + error.message);
    return;
  }

  isAdmin = true;
  updateAdminUI();
  await loadData();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();

  isAdmin = false;
  infoData = [];
  wikiData = [];
  jobData = [];

  updateAdminUI();
  renderAll();
});

/* UPLOAD GAMBAR */

async function uploadImage(file) {
  if (!file) return "";

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { error } = await supabaseClient.storage
    .from("images")
    .upload(filePath, file);

  if (error) {
    alert("Gagal upload gambar: " + error.message);
    return "";
  }

  const { data } = supabaseClient.storage
    .from("images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/* LOAD DATA */

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

/* RENDER */

function createCard(type, item) {
  if (type === "info") {
    return `
      <article class="item-card">
        ${item.gambar ? `<img src="${item.gambar}" class="card-image" alt="${item.judul}">` : ""}
        <div class="meta"><span class="pill">${item.kategori || "-"}</span></div>
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
        ${item.gambar ? `<img src="${item.gambar}" class="card-image" alt="${item.judul}">` : ""}
        <div class="meta"><span class="pill">${item.kategori || "-"}</span></div>
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
      ${item.gambar ? `<img src="${item.gambar}" class="card-image" alt="${item.posisi}">` : ""}
      <div class="meta">
        <span class="pill">${item.perusahaan || "-"}</span>
        <span class="pill">${item.lokasi || "-"}</span>
      </div>
      <h3>${item.posisi}</h3>
      <p>${item.deskripsi || ""}</p>
      ${item.link ? `<a href="${item.link}" target="_blank" class="btn ghost">Buka Link</a>` : ""}
      <div class="card-actions">
        <button class="btn ghost" onclick="editJob(${item.id})">Edit</button>
        <button class="btn danger" onclick="deleteItem('job', ${item.id})">Hapus</button>
      </div>
    </article>
  `;
}

function renderList(type, listId, searchId) {
  const keyword = document.getElementById(searchId)?.value.toLowerCase() || "";

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

function updateDashboardStats() {
  const countInfo = document.getElementById("adminCountInfo");
  const countWiki = document.getElementById("adminCountWiki");
  const countJobs = document.getElementById("adminCountJobs");
  const countTotal = document.getElementById("adminCountTotal");

  if (!countInfo || !countWiki || !countJobs || !countTotal) return;

  countInfo.textContent = infoData.length;
  countWiki.textContent = wikiData.length;
  countJobs.textContent = jobData.length;
  countTotal.textContent = infoData.length + wikiData.length + jobData.length;
}

function renderAll() {
  updateDashboardStats();

  if (document.getElementById("infoList")) renderList("info", "infoList", "infoSearch");
  if (document.getElementById("wikiList")) renderList("wiki", "wikiList", "wikiSearch");
  if (document.getElementById("jobList")) renderList("job", "jobList", "jobSearch");
}

/* CRUD INFO */

document.getElementById("infoForm").addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("infoId").value;
  const imageFile = document.getElementById("infoImage")?.files[0];
  const imageUrl = await uploadImage(imageFile);

  const payload = {
    judul: document.getElementById("infoTitle").value,
    kategori: document.getElementById("infoCategory").value,
    isi: document.getElementById("infoContent").value
  };

  if (imageUrl) payload.gambar = imageUrl;

  let response;

  if (id) {
    response = await supabaseClient
      .from("informasi_kampus")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
  } else {
    response = await supabaseClient
      .from("informasi_kampus")
      .insert(payload)
      .select()
      .single();
  }

  if (response.error) {
    alert("Gagal menyimpan info kampus: " + response.error.message);
    return;
  }

  const savedId = id ? Number(id) : response.data.id;

await saveRelations(
  "info",
  savedId,
  getSelectedValues("infoKategoriMulti"),
  getSelectedValues("infoTagMulti"),
  getSelectedValues("infoJurusanMulti")
);
  
  clearForm("info");
  await loadData();
});

/* CRUD WIKI */

document.getElementById("wikiForm").addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("wikiId").value;
  const imageFile = document.getElementById("wikiImage")?.files[0];
  const imageUrl = await uploadImage(imageFile);

  const payload = {
    judul: document.getElementById("wikiTitle").value,
    kategori: document.getElementById("wikiTag").value,
    isi: document.getElementById("wikiContent").value
  };

  if (imageUrl) payload.gambar = imageUrl;

  let response;

  if (id) {
    response = await supabaseClient
      .from("wiki_kampus")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
  } else {
    response = await supabaseClient
      .from("wiki_kampus")
      .insert(payload)
      .select()
      .single();
  }

  if (response.error) {
    alert("Gagal menyimpan wiki: " + response.error.message);
    return;
  }

const savedId = id ? Number(id) : response.data.id;

await saveRelations(
  "wiki",
  savedId,
  getSelectedValues("wikiKategoriMulti"),
  getSelectedValues("wikiTagMulti"),
  getSelectedValues("wikiJurusanMulti")
);
  
  clearForm("wiki");
  await loadData();
});

/* CRUD LOWONGAN */

document.getElementById("jobForm").addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("jobId").value;
  const imageFile = document.getElementById("jobImage")?.files[0];
  const imageUrl = await uploadImage(imageFile);

  const payload = {
    posisi: document.getElementById("jobTitle").value,
    perusahaan: document.getElementById("jobCompany").value,
    lokasi: document.getElementById("jobLocation").value,
    link: document.getElementById("jobLink").value,
    deskripsi: document.getElementById("jobContent").value
  };

  if (imageUrl) payload.gambar = imageUrl;

  let response;

  if (id) {
    response = await supabaseClient
      .from("lowongan_kerja")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
  } else {
    response = await supabaseClient
      .from("lowongan_kerja")
      .insert(payload)
      .select()
      .single();
  }

  if (response.error) {
    alert("Gagal menyimpan lowongan: " + response.error.message);
    return;
  }


  const savedId = id ? Number(id) : response.data.id;

  await saveRelations(
    "job",
    savedId,
    getSelectedValues("jobKategoriMulti"),
    getSelectedValues("jobTagMulti"),
    getSelectedValues("jobJurusanMulti")
  );
    
  clearForm("job");
  await loadData();
});

/* EDIT */

async function editInfo(id) {
  const item = infoData.find(row => row.id === id);
  if (!item) return;

  document.getElementById("infoId").value = item.id;
  document.getElementById("infoTitle").value = item.judul;
  document.getElementById("infoCategory").value = item.kategori || "";
  document.getElementById("infoContent").value = item.isi;

  await setSelectedRelations(
    "info",
    id,
    "infoKategoriMulti",
    "infoTagMulti",
    "infoJurusanMulti"
  );

  location.hash = "#kampus";
}

async function editWiki(id) {
  const item = wikiData.find(row => row.id === id);
  if (!item) return;

  document.getElementById("wikiId").value = item.id;
  document.getElementById("wikiTitle").value = item.judul;
  document.getElementById("wikiTag").value = item.kategori || "";
  document.getElementById("wikiContent").value = item.isi;

  await setSelectedRelations(
    "wiki",
    id,
    "wikiKategoriMulti",
    "wikiTagMulti",
    "wikiJurusanMulti"
  );

  location.hash = "#wiki";
}

async function editJob(id) {
  const item = jobData.find(row => row.id === id);
  if (!item) return;

  document.getElementById("jobId").value = item.id;
  document.getElementById("jobTitle").value = item.posisi;
  document.getElementById("jobCompany").value = item.perusahaan;
  document.getElementById("jobLocation").value = item.lokasi || "";
  document.getElementById("jobLink").value = item.link || "";
  document.getElementById("jobContent").value = item.deskripsi || "";

  await setSelectedRelations(
    "job",
    id,
    "jobKategoriMulti",
    "jobTagMulti",
    "jobJurusanMulti"
  );

  location.hash = "#lowongan";
}

/* DELETE */

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

/* CLEAR */

function clearForm(type) {
  document.getElementById(`${type}Form`).reset();
  document.getElementById(`${type}Id`).value = "";
}

async function getRelations(type, artikelId) {
  const { data: kategoriRows } = await supabaseClient
    .from("artikel_kategori")
    .select("kategori_id")
    .eq("artikel_tipe", type)
    .eq("artikel_id", artikelId);

  const { data: tagRows } = await supabaseClient
    .from("artikel_tags")
    .select("tag_id")
    .eq("artikel_tipe", type)
    .eq("artikel_id", artikelId);

  const { data: jurusanRows } = await supabaseClient
    .from("artikel_jurusan")
    .select("jurusan_id")
    .eq("artikel_tipe", type)
    .eq("artikel_id", artikelId);

  const kategoriNames = (kategoriRows || [])
    .map(row => kategoriData.find(k => k.id === row.kategori_id)?.nama)
    .filter(Boolean);

  const tagNames = (tagRows || [])
    .map(row => tagData.find(t => t.id === row.tag_id)?.nama)
    .filter(Boolean);

  const jurusanNames = (jurusanRows || [])
    .map(row => jurusanData.find(j => j.id === row.jurusan_id)?.nama)
    .filter(Boolean);

  return { kategoriNames, tagNames, jurusanNames };
}

async function setSelectedRelations(type, artikelId, kategoriSelectId, tagSelectId, jurusanSelectId) {
  const relations = await getRelations(type, artikelId);

  setSelectedOptions(kategoriSelectId, kategoriData, relations.kategoriNames);
  setSelectedOptions(tagSelectId, tagData, relations.tagNames);
  setSelectedOptions(jurusanSelectId, jurusanData, relations.jurusanNames);
}

function setSelectedOptions(selectId, masterData, selectedNames) {
  const select = document.getElementById(selectId);
  if (!select) return;

  Array.from(select.options).forEach(option => {
    const item = masterData.find(row => row.id === Number(option.value));
    option.selected = item && selectedNames.includes(item.nama);
  });
}


/* SEARCH */

["infoSearch", "wikiSearch", "jobSearch"].forEach(id => {
  const input = document.getElementById(id);
  if (input) input.addEventListener("input", renderAll);
});

/* START */

checkSession();
