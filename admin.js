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
let dokumenData = [];
let faqData = [];

let kategoriData = [];
let tagData = [];
let jurusanData = [];
let biayaPendidikanData = [];

let statistikData = [];
let jurusanAdminData = [];
let kategoriAdminData = [];
let tagAdminData = [];

let infoEditor = null;
let wikiEditor = null;
let jobEditor = null;

/* =========================
   HELPERS
========================= */

function qs(id) {
  return document.getElementById(id);
}

function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || div.innerText || "").trim();
}

function makeSlug(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function initQuillEditors() {
  if (!window.Quill) {
    console.warn("Quill belum dimuat. Pastikan CDN Quill sudah ada di admin.html.");
    return;
  }

  if (qs("infoEditor") && !infoEditor) {
    infoEditor = new Quill("#infoEditor", {
      theme: "snow",
      placeholder: "Tulis isi informasi kampus...",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "blockquote", "image"],
          ["clean"]
        ]
      }
    });
  }

  if (qs("wikiEditor") && !wikiEditor) {
    wikiEditor = new Quill("#wikiEditor", {
      theme: "snow",
      placeholder: "Tulis isi wiki kampus...",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "blockquote", "image"],
          ["clean"]
        ]
      }
    });
  }

  if (qs("jobEditor") && !jobEditor) {
    jobEditor = new Quill("#jobEditor", {
      theme: "snow",
      placeholder: "Tulis deskripsi lowongan...",
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "blockquote", "image"],
          ["clean"]
        ]
      }
    });
  }

    // TAMBAHKAN DI SINI
  setupQuillImageUpload(infoEditor);
  setupQuillImageUpload(wikiEditor);
  setupQuillImageUpload(jobEditor);
  setupDraftAutosave("info", infoEditor);
  setupDraftAutosave("wiki", wikiEditor);
  setupDraftAutosave("job", jobEditor);
}

/* =========================
   AUTO SAVE DRAFT
========================= */

function setupDraftAutosave(type, editor) {
  if (!editor) return;

  const key = `draft_${type}`;

  const saved = localStorage.getItem(key);

  if (saved) {
    editor.root.innerHTML = saved;
  }

  editor.on("text-change", () => {
    localStorage.setItem(
      key,
      editor.root.innerHTML
    );
  });
}


function getEditorHTML(type) {
  if (type === "info" && infoEditor) return infoEditor.root.innerHTML;
  if (type === "wiki" && wikiEditor) return wikiEditor.root.innerHTML;
  if (type === "job" && jobEditor) return jobEditor.root.innerHTML;

  const fallback = qs(`${type}Content`);
  return fallback ? fallback.value : "";
}

function setEditorHTML(type, html) {
  if (type === "info" && infoEditor) {
    infoEditor.root.innerHTML = html || "";
    return;
  }

  if (type === "wiki" && wikiEditor) {
    wikiEditor.root.innerHTML = html || "";
    return;
  }

  if (type === "job" && jobEditor) {
    jobEditor.root.innerHTML = html || "";
    return;
  }

  const fallback = qs(`${type}Content`);
  if (fallback) fallback.value = html || "";
}

function clearEditor(type) {
  if (type === "info" && infoEditor) infoEditor.setContents([]);
  if (type === "wiki" && wikiEditor) wikiEditor.setContents([]);
  if (type === "job" && jobEditor) jobEditor.setContents([]);
}

function showAdminPage(pageId) {
  document.querySelectorAll(".sidebar-link[data-page]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });

  document.querySelectorAll(".admin-page").forEach(page => {
    page.classList.toggle("active", page.id === pageId);
  });
}

/* =========================
   LOGIN
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
    await refreshAdminData();
  }
}

function updateAdminUI() {
  const loginBox = qs("loginBox");
  const adminPanel = qs("adminPanel");
  const loginBtn = qs("loginBtn");
  const logoutBtn = qs("logoutBtn");
  const loginStatus = qs("loginStatus");

  if (loginBox) loginBox.style.display = isAdmin ? "none" : "block";
  if (adminPanel) adminPanel.style.display = isAdmin ? "block" : "none";

  if (loginBtn) loginBtn.style.display = isAdmin ? "none" : "inline-block";
  if (logoutBtn) logoutBtn.style.display = isAdmin ? "inline-block" : "none";

  if (loginStatus) {
    loginStatus.textContent = isAdmin
      ? "Login berhasil. Mode admin aktif."
      : "Belum login.";
  }
}

async function refreshAdminData() {
  await loadMasterData();
  await loadData();
  await loadStatistikData();
  await loadJurusanAdminData();
  populateBiayaJurusanOptions();
  await loadBiayaPendidikanAdminData();
  await loadTaxonomyAdminData();
  await loadDokumenData();
  await loadFaqData();
}

if (qs("loginBtn")) {
  qs("loginBtn").addEventListener("click", async () => {
    const email = qs("adminEmail").value.trim();
    const password = qs("adminPassword").value.trim();

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
    await refreshAdminData();
  });
}

if (qs("logoutBtn")) {
  qs("logoutBtn").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();

    isAdmin = false;
    infoData = [];
    wikiData = [];
    jobData = [];

    updateAdminUI();
    renderAll();
  });
}

/* =========================
   MASTER DATA / CHECKBOX
========================= */

async function loadMasterData() {
  const { data: kategori, error: kategoriError } = await supabaseClient
    .from("kategori")
    .select("*")
    .order("nama", { ascending: true });

  const { data: tags, error: tagError } = await supabaseClient
    .from("tags")
    .select("*")
    .order("nama", { ascending: true });

  const { data: jurusan, error: jurusanError } = await supabaseClient
    .from("jurusan")
    .select("*")
    .order("nama", { ascending: true });

  if (kategoriError) console.error("Kategori error:", kategoriError);
  if (tagError) console.error("Tag error:", tagError);
  if (jurusanError) console.error("Jurusan error:", jurusanError);

  kategoriData = kategori || [];
  tagData = tags || [];
  jurusanData = jurusan || [];

  const kategoriInfo = kategoriData.filter(item => (item.tipe || "info") === "info");
  const kategoriWiki = kategoriData.filter(item => item.tipe === "wiki");

  fillCheckGroup("infoKategoriMulti", kategoriInfo);
  fillCheckGroup("wikiKategoriMulti", kategoriWiki);

  fillCheckGroup("wikiTagMulti", tagData);
  fillCheckGroup("jobTagMulti", tagData);

  fillCheckGroup("jobJurusanMulti", jurusanData);

  fillSingleSelect("statistikJurusan", jurusanData);
}

function fillCheckGroup(elementId, data) {
  const container = qs(elementId);
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

function fillSingleSelect(elementId, data) {
  const select = qs(elementId);
  if (!select) return;

  select.innerHTML =
    `<option value="">Pilih jurusan</option>` +
    data.map(item => `<option value="${item.id}">${item.nama}</option>`).join("");
}

function getSelectedValues(elementId) {
  const container = qs(elementId);
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

  return {
    kategoriIds: (kategoriRows || []).map(row => Number(row.kategori_id)),
    tagIds: (tagRows || []).map(row => Number(row.tag_id)),
    jurusanIds: (jurusanRows || []).map(row => Number(row.jurusan_id))
  };
}

async function setSelectedRelations(type, artikelId, kategoriId, tagId, jurusanId) {
  const relations = await getRelations(type, artikelId);

  setCheckedOptions(kategoriId, relations.kategoriIds);
  setCheckedOptions(tagId, relations.tagIds);
  setCheckedOptions(jurusanId, relations.jurusanIds);
}

function setCheckedOptions(containerId, selectedIds) {
  const container = qs(containerId);
  if (!container) return;

  container.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.checked = selectedIds.includes(Number(input.value));
  });
}

/* =========================
   UPLOAD GAMBAR
========================= */

async function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = e => {
      img.src = e.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, ".jpg"),
            { type: "image/jpeg" }
          );

          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };

    reader.readAsDataURL(file);
  });
}

async function uploadImage(file) {
  if (!file) return "";
  file = await compressImage(file);

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

function setupQuillImageUpload(editor) {
  if (!editor) return;

  const toolbar = editor.getModule("toolbar");

  toolbar.addHandler("image", () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      const imageUrl = await uploadImage(file);
      if (!imageUrl) return;

      const range = editor.getSelection(true);
      editor.insertEmbed(range.index, "image", imageUrl);
      editor.setSelection(range.index + 1);
    };
  });
}

/* =========================
   LOAD DATA
========================= */

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

/* =========================
   RENDER CONTENT LIST
========================= */

function createCard(type, item) {
  if (type === "info") {
    return `
      <article class="admin-list-item">
        <div>
          <span class="pill">Info Kampus</span>
          <h3>${item.judul || "-"}</h3>
          <p>${stripHTML(item.isi).slice(0, 100)}...</p>
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
          <span class="pill">Wiki Kampus</span>
          <h3>${item.judul || "-"}</h3>
          <p>${stripHTML(item.isi).slice(0, 100)}...</p>
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
        <h3>${item.posisi || "-"}</h3>
        <p>${stripHTML(item.deskripsi).slice(0, 100)}...</p>
      </div>

      <div class="card-actions">
        <button class="btn ghost" onclick="editJob(${item.id})">Edit</button>
        <button class="btn danger" onclick="deleteItem('job', ${item.id})">Hapus</button>
      </div>
    </article>
  `;
}

function renderList(type, listId, searchId) {
  const keyword = qs(searchId)?.value.toLowerCase() || "";

  let data = [];
  if (type === "info") data = infoData;
  if (type === "wiki") data = wikiData;
  if (type === "job") data = jobData;

  const filtered = data.filter(item =>
    JSON.stringify(item).toLowerCase().includes(keyword)
  );

  const list = qs(listId);
  if (!list) return;

  list.innerHTML = filtered.length
    ? filtered.map(item => createCard(type, item)).join("")
    : `<div class="empty">Belum ada data.</div>`;
}

function updateDashboardStats() {
  const totalKonten =
    infoData.length +
    wikiData.length +
    jobData.length +
    dokumenData.length +
    faqData.length;

  if (qs("adminCountInfo")) qs("adminCountInfo").textContent = infoData.length;
  if (qs("adminCountWiki")) qs("adminCountWiki").textContent = wikiData.length;
  if (qs("adminCountJobs")) qs("adminCountJobs").textContent = jobData.length;
  if (qs("adminCountJurusan")) qs("adminCountJurusan").textContent = jurusanAdminData.length || jurusanData.length;
  if (qs("adminCountDokumen")) qs("adminCountDokumen").textContent = dokumenData.length;
  if (qs("adminCountFaq")) qs("adminCountFaq").textContent = faqData.length;
  if (qs("adminCountKategori")) qs("adminCountKategori").textContent = kategoriAdminData.length || kategoriData.length;
  if (qs("adminCountTag")) qs("adminCountTag").textContent = tagAdminData.length || tagData.length;
  if (qs("adminCountTotal")) qs("adminCountTotal").textContent = totalKonten;
}

function renderAll() {
  updateDashboardStats();

  if (qs("infoList")) renderList("info", "infoList", "infoSearch");
  if (qs("wikiList")) renderList("wiki", "wikiList", "wikiSearch");
  if (qs("jobList")) renderList("job", "jobList", "jobSearch");
}

/* =========================
   CRUD INFO
========================= */

if (qs("infoForm")) {
  qs("infoForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("infoId").value;
    const imageFile = qs("infoImage")?.files[0];
    const imageUrl = await uploadImage(imageFile);

    const payload = {
      judul: qs("infoTitle").value,
      kategori: "",
      isi: getEditorHTML("info")
    };

    if (imageUrl) payload.gambar = imageUrl;

    let response;

    if (id) {
      response = await supabaseClient
        .from("informasi_kampus")
        .update(payload)
        .eq("id", id);
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
    localStorage.removeItem("draft_info");
  });
}

/* =========================
   CRUD WIKI
========================= */

if (qs("wikiForm")) {
  qs("wikiForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("wikiId").value;
    const imageFile = qs("wikiImage")?.files[0];
    const imageUrl = await uploadImage(imageFile);

    const payload = {
      judul: qs("wikiTitle").value,
      kategori: "",
      isi: getEditorHTML("wiki")
    };

    if (imageUrl) payload.gambar = imageUrl;

    let response;

    if (id) {
      response = await supabaseClient
        .from("wiki_kampus")
        .update(payload)
        .eq("id", id);
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
    localStorage.removeItem("draft_wiki");
  });
}

/* =========================
   CRUD LOWONGAN
========================= */

if (qs("jobForm")) {
  qs("jobForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("jobId").value;
    const imageFile = qs("jobImage")?.files[0];
    const imageUrl = await uploadImage(imageFile);

    const payload = {
      posisi: qs("jobTitle").value,
      perusahaan: qs("jobCompany").value,
      lokasi: qs("jobLocation").value,
      link: qs("jobLink").value,
      deskripsi: getEditorHTML("job")
    };

    if (imageUrl) payload.gambar = imageUrl;

    let response;

    if (id) {
      response = await supabaseClient
        .from("lowongan_kerja")
        .update(payload)
        .eq("id", id);
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
    localStorage.removeItem("draft_job");
  });
}

/* =========================
   CRUD DOKUMEN
========================= */

async function loadDokumenData() {
  const { data } = await supabaseClient
    .from("dokumen_kampus")
    .select("*")
    .order("created_at", { ascending: false });

  dokumenData = data || [];
  renderDokumenList();
}

function renderDokumenList() {
  const list = qs("dokumenList");
  if (!list) return;

  list.innerHTML = dokumenData.length
    ? dokumenData.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.kategori || "Dokumen"}</span>
          <h3>${item.judul}</h3>
          <p>${item.deskripsi || ""}</p>
        </div>

        <div class="card-actions">
          <a href="${item.link}" target="_blank" class="btn ghost">Buka</a>
          <button class="btn ghost" onclick="editDokumen(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteDokumen(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada dokumen.</div>`;
}

if (qs("dokumenForm")) {
  qs("dokumenForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("dokumenId").value;

    const payload = {
      judul: qs("dokumenJudul").value,
      kategori: qs("dokumenKategori").value,
      deskripsi: qs("dokumenDeskripsi").value,
      link: qs("dokumenLink").value
    };

    const response = id
      ? await supabaseClient.from("dokumen_kampus").update(payload).eq("id", id)
      : await supabaseClient.from("dokumen_kampus").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan dokumen: " + response.error.message);
      return;
    }

    clearDokumenForm();
    await loadDokumenData();
  });
}

function editDokumen(id) {
  const item = dokumenData.find(row => row.id === id);
  if (!item) return;

  qs("dokumenId").value = item.id;
  qs("dokumenJudul").value = item.judul || "";
  qs("dokumenKategori").value = item.kategori || "";
  qs("dokumenDeskripsi").value = item.deskripsi || "";
  qs("dokumenLink").value = item.link || "";

  showAdminPage("dokumenPage");
}

async function deleteDokumen(id) {
  if (!confirm("Yakin ingin menghapus dokumen ini?")) return;

  const { error } = await supabaseClient
    .from("dokumen_kampus")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus dokumen: " + error.message);
    return;
  }

  await loadDokumenData();
}

function clearDokumenForm() {
  qs("dokumenForm")?.reset();
  if (qs("dokumenId")) qs("dokumenId").value = "";
}

/* =========================
   CRUD FAQ
========================= */

async function loadFaqData() {
  const { data } = await supabaseClient
    .from("faq_kampus")
    .select("*")
    .order("created_at", { ascending: false });

  faqData = data || [];
  renderFaqList();
}

function renderFaqList() {
  const list = qs("faqList");
  if (!list) return;

  list.innerHTML = faqData.length
    ? faqData.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.kategori || "FAQ"}</span>
          <h3>${item.pertanyaan}</h3>
          <p>${item.jawaban || ""}</p>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editFaq(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteFaq(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada FAQ.</div>`;
}

if (qs("faqForm")) {
  qs("faqForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("faqId").value;

    const payload = {
      pertanyaan: qs("faqPertanyaan").value,
      kategori: qs("faqKategori").value,
      jawaban: qs("faqJawaban").value
    };

    const response = id
      ? await supabaseClient.from("faq_kampus").update(payload).eq("id", id)
      : await supabaseClient.from("faq_kampus").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan FAQ: " + response.error.message);
      return;
    }

    clearFaqForm();
    await loadFaqData();
  });
}

function editFaq(id) {
  const item = faqData.find(row => row.id === id);
  if (!item) return;

  qs("faqId").value = item.id;
  qs("faqPertanyaan").value = item.pertanyaan || "";
  qs("faqKategori").value = item.kategori || "";
  qs("faqJawaban").value = item.jawaban || "";

  showAdminPage("faqPage");
}

async function deleteFaq(id) {
  if (!confirm("Yakin ingin menghapus FAQ ini?")) return;

  const { error } = await supabaseClient
    .from("faq_kampus")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus FAQ: " + error.message);
    return;
  }

  await loadFaqData();
}

function clearFaqForm() {
  qs("faqForm")?.reset();
  if (qs("faqId")) qs("faqId").value = "";
}

/* =========================
   EDIT DATA
========================= */

async function editInfo(id) {
  const item = infoData.find(row => row.id === id);
  if (!item) return;

  qs("infoId").value = item.id;
  qs("infoTitle").value = item.judul || "";
  setEditorHTML("info", item.isi || "");

  await setSelectedRelations(
    "info",
    id,
    "infoKategoriMulti",
    "",
    ""
  );

  showAdminPage("infoPage");
}

async function editWiki(id) {
  const item = wikiData.find(row => row.id === id);
  if (!item) return;

  qs("wikiId").value = item.id;
  qs("wikiTitle").value = item.judul || "";
  setEditorHTML("wiki", item.isi || "");

  await setSelectedRelations(
    "wiki",
    id,
    "wikiKategoriMulti",
    "wikiTagMulti",
    ""
  );

  showAdminPage("wikiPage");
}

async function editJob(id) {
  const item = jobData.find(row => row.id === id);
  if (!item) return;

  qs("jobId").value = item.id;
  qs("jobTitle").value = item.posisi || "";
  qs("jobCompany").value = item.perusahaan || "";
  qs("jobLocation").value = item.lokasi || "";
  qs("jobLink").value = item.link || "";
  setEditorHTML("job", item.deskripsi || "");

  await setSelectedRelations(
    "job",
    id,
    "",
    "jobTagMulti",
    "jobJurusanMulti"
  );

  showAdminPage("jobPage");
}

/* =========================
   DELETE CONTENT
========================= */

async function deleteItem(type, id) {
  if (!confirm("Yakin ingin menghapus data ini?")) return;

  await supabaseClient
    .from("artikel_kategori")
    .delete()
    .eq("artikel_tipe", type)
    .eq("artikel_id", id);

  await supabaseClient
    .from("artikel_tags")
    .delete()
    .eq("artikel_tipe", type)
    .eq("artikel_id", id);

  await supabaseClient
    .from("artikel_jurusan")
    .delete()
    .eq("artikel_tipe", type)
    .eq("artikel_id", id);

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

  if (response?.error) {
    alert("Gagal menghapus data: " + response.error.message);
    return;
  }

  await loadData();
}

/* =========================
   CLEAR FORM
========================= */

function clearForm(type) {
  const form = qs(`${type}Form`);
  const idInput = qs(`${type}Id`);

  if (form) form.reset();
  if (idInput) idInput.value = "";

  clearEditor(type);

  const relationIds = {
    info: ["infoKategoriMulti"],
    wiki: ["wikiKategoriMulti", "wikiTagMulti"],
    job: ["jobTagMulti", "jobJurusanMulti"]
  };

  (relationIds[type] || []).forEach(containerId => {
    const container = qs(containerId);
    if (!container) return;

    container.querySelectorAll("input[type='checkbox']").forEach(input => {
      input.checked = false;
    });
  });
}

/* =========================
   STATISTIK JURUSAN
========================= */

async function loadStatistikData() {
  const { data } = await supabaseClient
    .from("statistik_jurusan")
    .select("*, jurusan:jurusan_id(nama)")
    .order("tahun", { ascending: false });

  statistikData = data || [];
  renderStatistikList();
}

function renderStatistikList() {
  const list = qs("statistikList");
  if (!list) return;

  list.innerHTML = statistikData.length
    ? statistikData.map(item => {
        const persen = item.peminat > 0
          ? ((item.daya_tampung / item.peminat) * 100).toFixed(2)
          : "0.00";

        return `
          <article class="admin-list-item">
            <div>
              <span class="pill">${item.jurusan?.nama || "-"}</span>
              <h3>${item.jalur} ${item.tahun}</h3>
              <p>${item.daya_tampung} kursi dari ${item.peminat} peminat · ${persen}%</p>
            </div>

            <div class="card-actions">
              <button class="btn ghost" onclick="editStatistik(${item.id})">Edit</button>
              <button class="btn danger" onclick="deleteStatistik(${item.id})">Hapus</button>
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty">Belum ada statistik jurusan.</div>`;
}

if (qs("statistikForm")) {
  qs("statistikForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("statistikId").value;

    const payload = {
      jurusan_id: Number(qs("statistikJurusan").value),
      tahun: Number(qs("statistikTahun").value),
      jalur: qs("statistikJalur").value,
      daya_tampung: Number(qs("statistikDayaTampung").value),
      peminat: Number(qs("statistikPeminat").value)
    };

    const response = id
      ? await supabaseClient.from("statistik_jurusan").update(payload).eq("id", id)
      : await supabaseClient.from("statistik_jurusan").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan statistik: " + response.error.message);
      return;
    }

    clearStatistikForm();
    await loadStatistikData();
  });
}

function editStatistik(id) {
  const item = statistikData.find(row => row.id === id);
  if (!item) return;

  qs("statistikId").value = item.id;
  qs("statistikJurusan").value = item.jurusan_id;
  qs("statistikTahun").value = item.tahun;
  qs("statistikJalur").value = item.jalur;
  qs("statistikDayaTampung").value = item.daya_tampung;
  qs("statistikPeminat").value = item.peminat;

  showAdminPage("statistikPage");
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
  qs("statistikForm")?.reset();
  if (qs("statistikId")) qs("statistikId").value = "";
}

/* =========================
   DATA JURUSAN
========================= */

async function loadJurusanAdminData() {
  const { data } = await supabaseClient
    .from("jurusan")
    .select("*")
    .order("nama", { ascending: true });

  jurusanAdminData = data || [];
  renderJurusanAdminList();
}

function renderJurusanAdminList() {
  const list = qs("jurusanAdminList");
  if (!list) return;

  list.innerHTML = jurusanAdminData.length
    ? jurusanAdminData.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.fakultas || "-"}</span>
          <h3>${item.nama}</h3>
          <p>
            Jenjang: ${item.jenjang || "-"} · 
            Akreditasi: ${item.akreditasi || "-"} · 
            UKT: ${item.ukt || "-"}
          </p>
          <p>${stripHTML(item.deskripsi || "").slice(0, 80)}...</p>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editJurusan(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteJurusan(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada data jurusan.</div>`;
}

if (qs("jurusanForm")) {
  qs("jurusanForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("jurusanId").value;

    const payload = {
      nama: qs("jurusanNama").value,
      slug: qs("jurusanSlug").value,
      fakultas: qs("jurusanFakultas").value,
      jenjang: qs("jurusanJenjang").value,
      akreditasi: qs("jurusanAkreditasi").value,
      ukt: qs("jurusanUkt").value,
      website_resmi: qs("jurusanWebsite").value,
      url_kurikulum: qs("jurusanUrlKurikulum").value,
      url_akreditasi: qs("jurusanUrlAkreditasi").value,
      prospek_kerja: qs("jurusanProspekKerja").value,
      deskripsi: qs("jurusanDeskripsi").value
    };

    const response = id
      ? await supabaseClient.from("jurusan").update(payload).eq("id", id)
      : await supabaseClient.from("jurusan").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan jurusan: " + response.error.message);
      return;
    }

    clearJurusanForm();
    await loadJurusanAdminData();
    await loadMasterData();
  });
}

function editJurusan(id) {
  const item = jurusanAdminData.find(row => row.id === id);
  if (!item) return;

  qs("jurusanId").value = item.id;
  qs("jurusanNama").value = item.nama || "";
  qs("jurusanSlug").value = item.slug || "";
  qs("jurusanFakultas").value = item.fakultas || "";
  qs("jurusanJenjang").value = item.jenjang || "";
  qs("jurusanDeskripsi").value = item.deskripsi || "";
  qs("jurusanAkreditasi").value = item.akreditasi || "";
  qs("jurusanUkt").value = item.ukt || "";
  qs("jurusanWebsite").value = item.website_resmi || "";
  qs("jurusanUrlKurikulum").value = item.url_kurikulum || "";
  qs("jurusanUrlAkreditasi").value = item.url_akreditasi || "";
  qs("jurusanProspekKerja").value = item.prospek_kerja || "";

  showAdminPage("jurusanPage");
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
  qs("jurusanForm")?.reset();
  if (qs("jurusanId")) qs("jurusanId").value = "";
}

/* =========================
   KATEGORI & TAG
========================= */

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
  const list = qs("kategoriAdminList");
  if (!list) return;

  list.innerHTML = kategoriAdminData.length
    ? kategoriAdminData.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.tipe || "info"}</span>
          <h3>${item.nama}</h3>
          <p>Slug: ${item.slug}</p>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editKategori(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteKategori(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada kategori.</div>`;
}

function renderTagAdminList() {
  const list = qs("tagAdminList");
  if (!list) return;

  list.innerHTML = tagAdminData.length
    ? tagAdminData.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">tag</span>
          <h3>${item.nama}</h3>
          <p>Slug: ${item.slug}</p>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editTag(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteTag(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada tag.</div>`;
}

if (qs("kategoriForm")) {
  qs("kategoriForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("kategoriId").value;

    const payload = {
      nama: qs("kategoriNama").value,
      slug: qs("kategoriSlug").value,
      tipe: qs("kategoriTipe").value
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
}

if (qs("tagForm")) {
  qs("tagForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("tagId").value;

    const payload = {
      nama: qs("tagNama").value,
      slug: qs("tagSlug").value
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
}

function editKategori(id) {
  const item = kategoriAdminData.find(row => row.id === id);
  if (!item) return;

  qs("kategoriId").value = item.id;
  qs("kategoriNama").value = item.nama;
  qs("kategoriSlug").value = item.slug;
  qs("kategoriTipe").value = item.tipe || "info";

  showAdminPage("taxonomyPage");
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
  qs("kategoriForm")?.reset();
  if (qs("kategoriId")) qs("kategoriId").value = "";
}

function editTag(id) {
  const item = tagAdminData.find(row => row.id === id);
  if (!item) return;

  qs("tagId").value = item.id;
  qs("tagNama").value = item.nama;
  qs("tagSlug").value = item.slug;

  showAdminPage("taxonomyPage");
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
  qs("tagForm")?.reset();
  if (qs("tagId")) qs("tagId").value = "";
}

/* =========================
   CRUD BIAYA PENDIDIKAN
========================= */

function getJalurLabel(jalur) {
  const labels = {
    snbp_snbt: "SNBP/SNBT",
    mandiri: "Seleksi Mandiri",
    internasional: "Kelas Internasional",
    rpl: "RPL",
    reguler: "Reguler"
  };

  return labels[jalur] || jalur || "-";
}

function getJenisLabel(jenis) {
  const labels = {
    ukt: "UKT",
    ipi: "IPI / Uang Pangkal"
  };

  return labels[jenis] || jenis || "-";
}

async function loadBiayaPendidikanAdminData() {
  const { data, error } = await supabaseClient
    .from("biaya_pendidikan")
    .select(`
      *,
      jurusan:jurusan_id (
        nama
      )
    `)
    .order("tahun", { ascending: false })
    .order("jenjang", { ascending: true })
    .order("jalur", { ascending: true })
    .order("jenis", { ascending: true })
    .order("golongan", { ascending: true });

  if (error) {
    alert("Gagal memuat biaya pendidikan: " + error.message);
    return;
  }

  biayaPendidikanData = data || [];
  renderBiayaPendidikanAdminList();
}

function renderBiayaPendidikanAdminList() {
  const list = qs("biayaPendidikanAdminList");
  if (!list) return;

  list.innerHTML = biayaPendidikanData.length
    ? biayaPendidikanData.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.tahun}</span>
          <h3>${item.jurusan?.nama || "Jurusan tidak ditemukan"}</h3>
          <p>
            ${item.jenjang || "-"} ·
            ${getJalurLabel(item.jalur)} ·
            ${getJenisLabel(item.jenis)} ·
            ${item.golongan ? `Golongan ${item.golongan}` : "Tanpa golongan"} ·
            <strong>${formatRupiah(item.nominal)}</strong>
          </p>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editBiayaPendidikan(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteBiayaPendidikan(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada data biaya pendidikan.</div>`;
}

function populateBiayaJurusanOptions() {
  const select = qs("biayaJurusanId");
  if (!select) return;

  select.innerHTML = `
    <option value="">Pilih jurusan</option>
    ${jurusanAdminData.map(jurusan => `
      <option value="${jurusan.id}">
        ${jurusan.nama}
      </option>
    `).join("")}
  `;
}

if (qs("biayaPendidikanForm")) {
  qs("biayaPendidikanForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("biayaId").value;
    const golonganValue = qs("biayaGolongan").value;

    const payload = {
      jurusan_id: Number(qs("biayaJurusanId").value),
      tahun: Number(qs("biayaTahun").value),
      jenjang: qs("biayaJenjang").value,
      jalur: qs("biayaJalur").value,
      jenis: qs("biayaJenis").value,
      golongan: golonganValue ? Number(golonganValue) : null,
      nominal: Number(qs("biayaNominal").value)
    };

    const response = id
      ? await supabaseClient.from("biaya_pendidikan").update(payload).eq("id", id)
      : await supabaseClient.from("biaya_pendidikan").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan biaya pendidikan: " + response.error.message);
      return;
    }

    clearBiayaPendidikanForm();
    await loadBiayaPendidikanAdminData();
  });
}

function editBiayaPendidikan(id) {
  const item = biayaPendidikanData.find(row => row.id === id);
  if (!item) return;

  qs("biayaId").value = item.id;
  qs("biayaJurusanId").value = item.jurusan_id;
  qs("biayaTahun").value = item.tahun;
  qs("biayaJenjang").value = item.jenjang || "";
  qs("biayaJalur").value = item.jalur;
  qs("biayaJenis").value = item.jenis;
  qs("biayaGolongan").value = item.golongan || "";
  qs("biayaNominal").value = item.nominal;

  updateBiayaNominalPreview();

  showAdminPage("biayaPendidikanPage");
}

async function deleteBiayaPendidikan(id) {
  if (!confirm("Yakin ingin menghapus data biaya pendidikan ini?")) return;

  const { error } = await supabaseClient
    .from("biaya_pendidikan")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus biaya pendidikan: " + error.message);
    return;
  }

  await loadBiayaPendidikanAdminData();
}

function clearBiayaPendidikanForm() {
  qs("biayaPendidikanForm")?.reset();

  if (qs("biayaId")) qs("biayaId").value = "";
  if (qs("biayaTahun")) qs("biayaTahun").value = 2026;

  updateBiayaNominalPreview();
}

function updateBiayaNominalPreview() {
  const input = qs("biayaNominal");
  const preview = qs("biayaNominalPreview");

  if (!input || !preview) return;

  preview.textContent = formatRupiah(input.value || 0);
}

if (qs("biayaNominal")) {
  qs("biayaNominal").addEventListener("input", updateBiayaNominalPreview);
}

/* =========================
   AUTO SLUG
========================= */

function bindAutoSlug(sourceId, targetId) {
  const source = qs(sourceId);
  const target = qs(targetId);

  if (!source || !target) return;

  source.addEventListener("input", () => {
    target.value = makeSlug(source.value);
  });
}

bindAutoSlug("jurusanNama", "jurusanSlug");
bindAutoSlug("kategoriNama", "kategoriSlug");
bindAutoSlug("tagNama", "tagSlug");

/* =========================
   SIDEBAR
========================= */

document.querySelectorAll(".sidebar-link[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    showAdminPage(button.dataset.page);
  });
});

function initSidebarNavigation() {

  const links =
    document.querySelectorAll(".sidebar-link[data-page]");

  links.forEach(link => {

    link.addEventListener("click", () => {

      const page =
        link.dataset.page;

      document
        .querySelectorAll(".sidebar-link")
        .forEach(item =>
          item.classList.remove("active")
        );

      link.classList.add("active");

      document
        .querySelectorAll(".admin-page")
        .forEach(item =>
          item.classList.remove("active")
        );

      document
        .getElementById(page)
        ?.classList.add("active");

    });

  });

}

/* =========================
   SEARCH
========================= */

["infoSearch", "wikiSearch", "jobSearch"].forEach(id => {
  const input = qs(id);
  if (input) input.addEventListener("input", renderAll);
});


/* =========================
   START
========================= */

initQuillEditors();
initSidebarNavigation();
checkSession();
