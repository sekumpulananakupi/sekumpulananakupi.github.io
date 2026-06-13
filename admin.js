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
let statistikData = [];
let jurusanAdminData = [];
let kategoriAdminData = [];
let tagAdminData = [];

async function loadMasterData() {
  const { data: kategori } = await supabaseClient
  .from("kategori")
  .select("*")
  .order("nama", { ascending: true });

kategoriData = kategori || [];

const kategoriInfo = kategoriData.filter(item => item.tipe === "info");
const kategoriWiki = kategoriData.filter(item => item.tipe === "wiki");

fillMultiSelect("infoKategoriMulti", kategoriInfo);
fillMultiSelect("wikiKategoriMulti", kategoriWiki);
  
fillSingleSelect("statistikJurusan", jurusanData);
}

function fillSingleSelect(elementId, data) {
  const select = document.getElementById(elementId);
  if (!select) return;

  select.innerHTML =
    `<option value="">Pilih jurusan</option>` +
    data.map(item => `<option value="${item.id}">${item.nama}</option>`).join("");
}

async function loadStatistikData() {
  const { data } = await supabaseClient
    .from("statistik_jurusan")
    .select("*, jurusan:jurusan_id(nama)")
    .order("tahun", { ascending: false });

  statistikData = data || [];
  renderStatistikList();
}

function fillMultiSelect(elementId, data) {
  const container = document.getElementById(elementId);
  if (!container) return;

  container.innerHTML = data
    .map(item => `
      <label class="check-option">
        <input type="checkbox" value="${item.id}">
        <span>${item.nama}</span>
      </label>
    `)
    .join("");
}

function getSelectedValues(elementId) {
  const container = document.getElementById(elementId);
  if (!container) return [];

  return Array.from(container.querySelectorAll("input[type='checkbox']:checked"))
    .map(input => Number(input.value));
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
    await loadStatistikData();
    await loadJurusanAdminData();
    await loadTaxonomyAdminData();
  }
}

function updateAdminUI() {
  const loginBox = document.getElementById("loginBox");
  const adminPanel = document.getElementById("adminPanel");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginStatus = document.getElementById("loginStatus");

  loginBox.style.display = isAdmin ? "none" : "block";
  adminPanel.style.display = isAdmin ? "block" : "none";

  if (loginBtn) loginBtn.style.display = isAdmin ? "none" : "inline-block";
  if (logoutBtn) logoutBtn.style.display = isAdmin ? "inline-block" : "none";

  if (loginStatus) {
    loginStatus.textContent = isAdmin
      ? "Login berhasil. Mode admin aktif."
      : "Belum login.";
  }
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
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.kategori || "Info"}</span>
          <h3>${item.judul}</h3>
          <p>${item.isi ? item.isi.slice(0, 100) : ""}...</p>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editInfo(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteItem('info', ${item.id})">Hapus</button>
        </div>
      </article>
    `;
  }

  if (type === "wiki") {
    return `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.kategori || "Wiki"}</span>
          <h3>${item.judul}</h3>
          <p>${item.isi ? item.isi.slice(0, 100) : ""}...</p>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editWiki(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteItem('wiki', ${item.id})">Hapus</button>
        </div>
      </article>
    `;
  }

  return `
    <article class="admin-list-item">
      <div>
        <span class="pill">${item.perusahaan || "Lowongan"}</span>
        <h3>${item.posisi}</h3>
        <p>${item.deskripsi ? item.deskripsi.slice(0, 100) : ""}...</p>
      </div>

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
  [],
  []
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
  []
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
  [],
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

function setSelectedOptions(containerId, masterData, selectedNames) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.querySelectorAll("input[type='checkbox']").forEach(input => {
    const item = masterData.find(row => row.id === Number(input.value));
    input.checked = item && selectedNames.includes(item.nama);
  });
}

function renderStatistikList() {
  const list = document.getElementById("statistikList");
  if (!list) return;

  list.innerHTML = statistikData.length
    ? statistikData.map(item => {
        const persen = item.peminat > 0
          ? ((item.daya_tampung / item.peminat) * 100).toFixed(2)
          : "0.00";

        return `
          <article class="item-card">
            <span class="pill">${item.jurusan?.nama || "-"}</span>
            <h3>${item.jalur} ${item.tahun}</h3>
            <p>Daya tampung: ${item.daya_tampung}</p>
            <p>Peminat: ${item.peminat}</p>
            <p>Persentase diterima: ${persen}%</p>

            <div class="card-actions">
              <button class="btn ghost" onclick="editStatistik(${item.id})">Edit</button>
              <button class="btn danger" onclick="deleteStatistik(${item.id})">Hapus</button>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty">Belum ada statistik jurusan.</div>`;
}

document.getElementById("statistikForm").addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("statistikId").value;

  const payload = {
    jurusan_id: Number(document.getElementById("statistikJurusan").value),
    tahun: Number(document.getElementById("statistikTahun").value),
    jalur: document.getElementById("statistikJalur").value,
    daya_tampung: Number(document.getElementById("statistikDayaTampung").value),
    peminat: Number(document.getElementById("statistikPeminat").value)
  };

  let response;

  if (id) {
    response = await supabaseClient
      .from("statistik_jurusan")
      .update(payload)
      .eq("id", id);
  } else {
    response = await supabaseClient
      .from("statistik_jurusan")
      .insert(payload);
  }

  if (response.error) {
    alert("Gagal menyimpan statistik: " + response.error.message);
    return;
  }

  clearStatistikForm();
  await loadStatistikData();
});

function editStatistik(id) {
  const item = statistikData.find(row => row.id === id);
  if (!item) return;

  document.getElementById("statistikId").value = item.id;
  document.getElementById("statistikJurusan").value = item.jurusan_id;
  document.getElementById("statistikTahun").value = item.tahun;
  document.getElementById("statistikJalur").value = item.jalur;
  document.getElementById("statistikDayaTampung").value = item.daya_tampung;
  document.getElementById("statistikPeminat").value = item.peminat;

  location.hash = "#statistik";
}

async function deleteStatistik(id) {
  if (!confirm("Yakin ingin menghapus statistik ini?")) return;

  const { error } = await supabaseClient
    .from("statistik_jurusan")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus statistik: " + error.message);
    return;
  }

  await loadStatistikData();
}

function clearStatistikForm() {
  document.getElementById("statistikForm").reset();
  document.getElementById("statistikId").value = "";
}

async function loadJurusanAdminData() {
  const { data } = await supabaseClient
    .from("jurusan")
    .select("*")
    .order("nama", { ascending: true });

  jurusanAdminData = data || [];
  renderJurusanAdminList();
}

function renderJurusanAdminList() {
  const list = document.getElementById("jurusanAdminList");
  if (!list) return;

  list.innerHTML = jurusanAdminData.length
    ? jurusanAdminData.map(item => `
      <article class="item-card">
        <span class="pill">${item.fakultas || "-"}</span>
        <h3>${item.nama}</h3>
        <p>Jenjang: ${item.jenjang || "-"}</p>
        <p>${item.deskripsi || "Belum ada deskripsi."}</p>

        <div class="card-actions">
          <button class="btn ghost" onclick="editJurusan(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteJurusan(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada data jurusan.</div>`;
}

document.getElementById("jurusanForm").addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("jurusanId").value;

  const payload = {
    nama: document.getElementById("jurusanNama").value,
    slug: document.getElementById("jurusanSlug").value,
    fakultas: document.getElementById("jurusanFakultas").value,
    jenjang: document.getElementById("jurusanJenjang").value,
    deskripsi: document.getElementById("jurusanDeskripsi").value
  };

  let response;

  if (id) {
    response = await supabaseClient
      .from("jurusan")
      .update(payload)
      .eq("id", id);
  } else {
    response = await supabaseClient
      .from("jurusan")
      .insert(payload);
  }

  if (response.error) {
    alert("Gagal menyimpan jurusan: " + response.error.message);
    return;
  }

  clearJurusanForm();
  await loadJurusanAdminData();
  await loadMasterData();
});

function editJurusan(id) {
  const item = jurusanAdminData.find(row => row.id === id);
  if (!item) return;

  document.getElementById("jurusanId").value = item.id;
  document.getElementById("jurusanNama").value = item.nama;
  document.getElementById("jurusanSlug").value = item.slug;
  document.getElementById("jurusanFakultas").value = item.fakultas || "";
  document.getElementById("jurusanJenjang").value = item.jenjang || "";
  document.getElementById("jurusanDeskripsi").value = item.deskripsi || "";

  location.hash = "#jurusanAdmin";
}

async function deleteJurusan(id) {
  if (!confirm("Yakin ingin menghapus jurusan ini?")) return;

  const { error } = await supabaseClient
    .from("jurusan")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus jurusan: " + error.message);
    return;
  }

  await loadJurusanAdminData();
  await loadMasterData();
}

function clearJurusanForm() {
  document.getElementById("jurusanForm").reset();
  document.getElementById("jurusanId").value = "";
}

function makeSlug(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const jurusanNamaInput = document.getElementById("jurusanNama");
const jurusanSlugInput = document.getElementById("jurusanSlug");

if (jurusanNamaInput && jurusanSlugInput) {
  jurusanNamaInput.addEventListener("input", () => {
    jurusanSlugInput.value = makeSlug(jurusanNamaInput.value);
  });
}

async function loadTaxonomyAdminData() {
  const { data: kategori } = await supabaseClient
    .from("kategori")
    .select("*")
    .order("nama", { ascending: true });

  const { data: tags } = await supabaseClient
    .from("tags")
    .select("*")
    .order("nama", { ascending: true });

  kategoriAdminData = kategori || [];
  tagAdminData = tags || [];

  renderKategoriAdminList();
  renderTagAdminList();
}

function renderKategoriAdminList() {
  const list = document.getElementById("kategoriAdminList");
  if (!list) return;

  list.innerHTML = kategoriAdminData.length
    ? kategoriAdminData.map(item => `
      <article class="item-card">
        <h3>${item.nama}</h3>
        <p>Slug: ${item.slug}</p>
        <div class="card-actions">
          <button class="btn ghost" onclick="editKategori(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteKategori(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada kategori.</div>`;
}

function renderTagAdminList() {
  const list = document.getElementById("tagAdminList");
  if (!list) return;

  list.innerHTML = tagAdminData.length
    ? tagAdminData.map(item => `
      <article class="item-card">
        <h3>${item.nama}</h3>
        <p>Slug: ${item.slug}</p>
        <div class="card-actions">
          <button class="btn ghost" onclick="editTag(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteTag(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada tag.</div>`;
}

document.getElementById("kategoriForm").addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("kategoriId").value;

  const payload = {
    nama: document.getElementById("kategoriNama").value,
    slug: document.getElementById("kategoriSlug").value
  };

  const response = id
    ? await supabaseClient.from("kategori").update(payload).eq("id", id)
    : await supabaseClient.from("kategori").insert(payload);

  if (response.error) {
    alert("Gagal menyimpan kategori: " + response.error.message);
    return;
  }

  clearKategoriForm();
  await loadTaxonomyAdminData();
  await loadMasterData();
});

document.getElementById("tagForm").addEventListener("submit", async event => {
  event.preventDefault();

  const id = document.getElementById("tagId").value;

  const payload = {
    nama: document.getElementById("tagNama").value,
    slug: document.getElementById("tagSlug").value
  };

  const response = id
    ? await supabaseClient.from("tags").update(payload).eq("id", id)
    : await supabaseClient.from("tags").insert(payload);

  if (response.error) {
    alert("Gagal menyimpan tag: " + response.error.message);
    return;
  }

  clearTagForm();
  await loadTaxonomyAdminData();
  await loadMasterData();
});

function editKategori(id) {
  const item = kategoriAdminData.find(row => row.id === id);
  if (!item) return;

  document.getElementById("kategoriId").value = item.id;
  document.getElementById("kategoriNama").value = item.nama;
  document.getElementById("kategoriSlug").value = item.slug;

  location.hash = "#taxonomyAdmin";
}

async function deleteKategori(id) {
  if (!confirm("Yakin ingin menghapus kategori ini?")) return;

  const { error } = await supabaseClient
    .from("kategori")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus kategori: " + error.message);
    return;
  }

  await loadTaxonomyAdminData();
  await loadMasterData();
}

function clearKategoriForm() {
  document.getElementById("kategoriForm").reset();
  document.getElementById("kategoriId").value = "";
}

function editTag(id) {
  const item = tagAdminData.find(row => row.id === id);
  if (!item) return;

  document.getElementById("tagId").value = item.id;
  document.getElementById("tagNama").value = item.nama;
  document.getElementById("tagSlug").value = item.slug;

  location.hash = "#taxonomyAdmin";
}

async function deleteTag(id) {
  if (!confirm("Yakin ingin menghapus tag ini?")) return;

  const { error } = await supabaseClient
    .from("tags")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus tag: " + error.message);
    return;
  }

  await loadTaxonomyAdminData();
  await loadMasterData();
}

function clearTagForm() {
  document.getElementById("tagForm").reset();
  document.getElementById("tagId").value = "";
}

const kategoriNamaInput = document.getElementById("kategoriNama");
const kategoriSlugInput = document.getElementById("kategoriSlug");

if (kategoriNamaInput && kategoriSlugInput) {
  kategoriNamaInput.addEventListener("input", () => {
    kategoriSlugInput.value = makeSlug(kategoriNamaInput.value);
  });
}

const tagNamaInput = document.getElementById("tagNama");
const tagSlugInput = document.getElementById("tagSlug");

if (tagNamaInput && tagSlugInput) {
  tagNamaInput.addEventListener("input", () => {
    tagSlugInput.value = makeSlug(tagNamaInput.value);
  });
}

document.querySelectorAll(".sidebar-link[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    const targetPage = button.dataset.page;

    document.querySelectorAll(".sidebar-link[data-page]").forEach(btn => {
      btn.classList.remove("active");
    });

    document.querySelectorAll(".admin-page").forEach(page => {
      page.classList.remove("active");
    });

    button.classList.add("active");
    document.getElementById(targetPage).classList.add("active");
  });
});

/* SEARCH */

["infoSearch", "wikiSearch", "jobSearch"].forEach(id => {
  const input = document.getElementById(id);
  if (input) input.addEventListener("input", renderAll);
});

/* START */

checkSession();
