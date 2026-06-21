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

let faqJurusanData = [];

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

function formatRupiah(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(number);
}

function formatGaji(item) {
  const min = item.gaji_min;
  const max = item.gaji_max;
  const note = item.gaji_keterangan;

  if (min && max) {
    return `${formatRupiah(min)} - ${formatRupiah(max)}`;
  }

  if (min && !max) {
    return `Mulai ${formatRupiah(min)}`;
  }

  if (!min && max) {
    return `Hingga ${formatRupiah(max)}`;
  }

  return note || "";
}

function getDeadlineStatus(deadline) {
  if (!deadline) return "";

  const today = new Date();
  const endDate = new Date(deadline);

  today.setHours(0,0,0,0);
  endDate.setHours(0,0,0,0);

  const diff =
    Math.ceil(
      (endDate - today) /
      (1000 * 60 * 60 * 24)
    );

  if (diff < 0) {
    return "❌ Ditutup";
  }

  if (diff === 0) {
    return "🔥 Ditutup Hari Ini";
  }

  if (diff <= 7) {
    return `⏳ ${diff} hari lagi`;
  }

  return `📅 ${diff} hari lagi`;
}

function isJobExpired(deadline) {
  if (!deadline) return false;

  const today = new Date();
  const endDate = new Date(deadline);

  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  return endDate < today;
}

function getEffectiveJobStatus(item) {
  if (isJobExpired(item.deadline)) {
    return "ditutup";
  }

  return item.status || "aktif";
}

async function autoCloseExpiredJobs() {
  const today = new Date()
    .toISOString()
    .split("T")[0];

  const { error } = await supabaseClient
    .from("lowongan_kerja")
    .update({
      status: "ditutup"
    })
    .lt("deadline", today)
    .neq("status", "ditutup");

  if (error) {
    console.error(
      "Auto close gagal:",
      error
    );
  }
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
  await autoCloseExpiredJobs();
  await loadMasterData();
  await loadData();
  await loadStatistikData();
  await loadJurusanAdminData();
  populateFaqJurusanOptions();
  await loadFaqJurusanData();
  populateBiayaJurusanOptions();
  await loadBiayaPendidikanAdminData();
  await loadTaxonomyAdminData();
  await loadDokumenData();
  await loadFaqData();

  renderAll();
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

  fillCheckGroup("jobJurusanMulti", jurusanData);

  fillSingleSelect("statistikJurusan", jurusanData);
}

function fillCheckGroup(elementId, data) {
  const container = qs(elementId);
  if (!container) return;

  container.className = "multi-select";

  container.innerHTML = `
    <button type="button" class="multi-select-button">Pilih data</button>

    <div class="multi-select-panel">
      <input type="search" class="multi-select-search" placeholder="Cari..." />

      <div class="multi-select-options">
        ${data.map(item => `
          <label class="multi-option">
            <input type="checkbox" value="${item.id}">
            <span>${item.nama}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;

  const button = container.querySelector(".multi-select-button");
  const search = container.querySelector(".multi-select-search");
  const options = container.querySelector(".multi-select-options");

  button.addEventListener("click", event => {
    event.stopPropagation();
    closeAllMultiSelect(container);
    container.classList.toggle("open");
    search.focus();
  });

  search.addEventListener("input", () => {
    const keyword = search.value.toLowerCase();

    options.querySelectorAll(".multi-option").forEach(option => {
      const text = option.textContent.toLowerCase();
      option.style.display = text.includes(keyword) ? "flex" : "none";
    });
  });

  container.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.addEventListener("change", () => {
      updateMultiSelectLabel(container);
    });
  });

  updateMultiSelectLabel(container);
}

function updateMultiSelectLabel(container) {
  const button = container.querySelector(".multi-select-button");
  const checked = container.querySelectorAll("input[type='checkbox']:checked");

  if (!button) return;

  if (!checked.length) {
    button.textContent = "Pilih data";
    return;
  }

  if (checked.length === 1) {
    const label = checked[0].closest("label")?.querySelector("span")?.textContent;
    button.textContent = label || "1 data dipilih";
    return;
  }

  button.textContent = `${checked.length} data dipilih`;
}

function closeAllMultiSelect(except = null) {
  document.querySelectorAll(".multi-select.open").forEach(select => {
    if (select !== except) select.classList.remove("open");
  });
}

document.addEventListener("click", () => {
  closeAllMultiSelect();
});

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

async function saveRelations(type, artikelId, kategoriIds = [], tagIds = [], jurusanIds = []) {
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
      <span class="pill">${item.perusahaan || "Lowongan"}</span>
      <span class="pill">${getEffectiveJobStatus(item)}</span>
      ${item.tipe_pekerjaan ? `<span class="pill">${item.tipe_pekerjaan}</span>` : ""}
      ${item.jenjang_pendidikan ? `<span class="pill">${item.jenjang_pendidikan}</span>` : ""}
      ${item.is_featured ? `<span class="pill">⭐ Pilihan</span>` : ""}
      ${item.sumber ? `<span class="pill">${item.sumber}</span>` : ""}

      <h3>${item.posisi || "-"}</h3>

      <p>${stripHTML(item.deskripsi).slice(0, 100)}...</p>

      ${
  formatGaji(item)
    ? `<p><strong>Gaji:</strong> ${formatGaji(item)}</p>`
    : ""
}

      ${
        item.deadline
          ? `<small>${getDeadlineStatus(item.deadline)}</small>`
          : ""
      }
    </div>

    <div class="card-actions">
      <button class="btn ghost" onclick="editJob(${item.id})">Edit</button>
      <button class="btn danger" onclick="deleteItem('job', ${item.id})">Hapus</button>
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

${
  item.deadline
    ? `<small>Deadline: ${new Date(item.deadline).toLocaleDateString("id-ID")}</small>`
    : ""
}
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

 let filtered = data.filter(item =>
  JSON.stringify(item).toLowerCase().includes(keyword)
);

if (type === "job") {
  const statusFilter = qs("jobStatusFilter")?.value || "all";
  const salaryFilter = qs("jobSalaryFilter")?.value || "all";

  if (statusFilter === "featured") {
    filtered = filtered.filter(item => item.is_featured);
  } else if (statusFilter !== "all") {
    filtered = filtered.filter(item =>
      getEffectiveJobStatus(item) === statusFilter
    );
  }

  if (salaryFilter === "with_salary") {
    filtered = filtered.filter(item =>
      item.gaji_min || item.gaji_max || item.gaji_keterangan
    );
  }

  if (salaryFilter === "without_salary") {
    filtered = filtered.filter(item =>
      !item.gaji_min && !item.gaji_max && !item.gaji_keterangan
    );
  }
}

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
  const jobAktif = jobData.filter(item => getEffectiveJobStatus(item) === "aktif").length;
  const jobDraft = jobData.filter(item => getEffectiveJobStatus(item) === "draft").length;
  const jobDitutup = jobData.filter(item => getEffectiveJobStatus(item) === "ditutup").length;
  const jobFeatured = jobData.filter(item => item.is_featured).length;
  if (qs("adminCountJobsActive")) qs("adminCountJobsActive").textContent = jobAktif;
  if (qs("adminCountJobsDraft")) qs("adminCountJobsDraft").textContent = jobDraft;
  if (qs("adminCountJobsClosed")) qs("adminCountJobsClosed").textContent = jobDitutup;
  if (qs("adminCountJobsFeatured")) qs("adminCountJobsFeatured").textContent = jobFeatured;
  if (qs("adminCountJurusan")) qs("adminCountJurusan").textContent = jurusanAdminData.length || jurusanData.length;
  if (qs("adminCountDokumen")) qs("adminCountDokumen").textContent = dokumenData.length;
  if (qs("adminCountFaq")) qs("adminCountFaq").textContent = faqData.length;
  if (qs("adminCountKategori")) qs("adminCountKategori").textContent = kategoriAdminData.length || kategoriData.length;
  if (qs("adminCountTag")) qs("adminCountTag").textContent = tagAdminData.length || tagData.length;
  if (qs("adminCountTotal")) qs("adminCountTotal").textContent = totalKonten;
}

let latestHealthIssues = [];
let latestHealthModuleStats = {};

function getTextLength(htmlOrText) {
  return stripHTML(htmlOrText || "").length;
}

function addHealthIssue(list, level, module, title, description, editPage = "", editFunction = "") {
  list.push({
    level,
    module,
    title,
    description,
    editPage,
    editFunction
  });
}

function getHealthModuleLabel(module) {
  const labels = {
    info: "Info Kampus",
    wiki: "Wiki Kampus",
    job: "Lowongan",
    jurusan: "Jurusan",
    faq: "FAQ",
    dokumen: "Dokumen"
  };

  return labels[module] || "Lainnya";
}

function initModuleStats() {
  return {
    info: { good: 0, issue: 0 },
    wiki: { good: 0, issue: 0 },
    job: { good: 0, issue: 0 },
    jurusan: { good: 0, issue: 0 },
    faq: { good: 0, issue: 0 },
    dokumen: { good: 0, issue: 0 }
  };
}

function countModuleIssue(stats, module) {
  if (stats[module]) stats[module].issue++;
}

function countModuleGood(stats, module) {
  if (stats[module]) stats[module].good++;
}

function renderWebsiteHealthDashboard() {
  const container = qs("websiteHealthList");
  if (!container) return;

  const issues = [];
  const moduleStats = initModuleStats();
  let goodCount = 0;

  infoData.forEach(item => {
    const isiLength = getTextLength(item.isi);
    let isGood = true;

    if (!item.gambar) {
      isGood = false;
      countModuleIssue(moduleStats, "info");
      addHealthIssue(
        issues,
        "warning",
        "info",
        `Info tanpa gambar: ${item.judul || "-"}`,
        "Sebaiknya setiap info kampus memiliki gambar agar tampil lebih menarik.",
        "infoPage",
        `editInfo(${item.id})`
      );
    }

    if (isiLength < 300) {
      isGood = false;
      countModuleIssue(moduleStats, "info");
      addHealthIssue(
        issues,
        "warning",
        "info",
        `Info terlalu pendek: ${item.judul || "-"}`,
        "Isi informasi masih terlalu pendek. Idealnya minimal 300 karakter.",
        "infoPage",
        `editInfo(${item.id})`
      );
    }

    if (isGood) {
      goodCount++;
      countModuleGood(moduleStats, "info");
    }
  });

  wikiData.forEach(item => {
    const isiLength = getTextLength(item.isi);
    let isGood = true;

    if (!item.gambar) {
      isGood = false;
      countModuleIssue(moduleStats, "wiki");
      addHealthIssue(
        issues,
        "warning",
        "wiki",
        `Wiki tanpa gambar: ${item.judul || "-"}`,
        "Artikel wiki akan lebih kuat jika memiliki gambar utama.",
        "wikiPage",
        `editWiki(${item.id})`
      );
    }

    if (isiLength < 500) {
      isGood = false;
      countModuleIssue(moduleStats, "wiki");
      addHealthIssue(
        issues,
        "warning",
        "wiki",
        `Wiki terlalu pendek: ${item.judul || "-"}`,
        "Artikel wiki sebaiknya lebih lengkap, minimal sekitar 500 karakter.",
        "wikiPage",
        `editWiki(${item.id})`
      );
    }

    if (isGood) {
      goodCount++;
      countModuleGood(moduleStats, "wiki");
    }
  });

  jobData.forEach(item => {
    const effectiveStatus = getEffectiveJobStatus(item);
    let isGood = true;

    if (effectiveStatus === "ditutup" && item.status !== "ditutup") {
      isGood = false;
      countModuleIssue(moduleStats, "job");
      addHealthIssue(
        issues,
        "critical",
        "job",
        `Lowongan expired belum ditutup: ${item.posisi || "-"}`,
        "Deadline sudah lewat, tetapi status asli belum ditutup.",
        "jobPage",
        `editJob(${item.id})`
      );
    }

    if (!item.deadline) {
      isGood = false;
      countModuleIssue(moduleStats, "job");
      addHealthIssue(
        issues,
        "warning",
        "job",
        `Lowongan tanpa deadline: ${item.posisi || "-"}`,
        "Deadline penting agar pengguna tahu batas pendaftaran.",
        "jobPage",
        `editJob(${item.id})`
      );
    }

    if (!item.link) {
      isGood = false;
      countModuleIssue(moduleStats, "job");
      addHealthIssue(
        issues,
        "critical",
        "job",
        `Lowongan tanpa link daftar: ${item.posisi || "-"}`,
        "Lowongan sebaiknya memiliki link pendaftaran.",
        "jobPage",
        `editJob(${item.id})`
      );
    }

    if (isGood) {
      goodCount++;
      countModuleGood(moduleStats, "job");
    }
  });

  jurusanAdminData.forEach(item => {
    const missingFields = [];

    if (!item.deskripsi) missingFields.push("deskripsi");
    if (!item.prospek_kerja) missingFields.push("prospek kerja");
    if (!item.url_kurikulum) missingFields.push("kurikulum");
    if (!item.url_akreditasi) missingFields.push("akreditasi");
    if (!item.website_resmi) missingFields.push("website resmi");

    if (missingFields.length >= 3) {
      countModuleIssue(moduleStats, "jurusan");
      addHealthIssue(
        issues,
        "critical",
        "jurusan",
        `Data jurusan kurang lengkap: ${item.nama || "-"}`,
        `Field kosong: ${missingFields.join(", ")}.`,
        "jurusanPage",
        `editJurusan(${item.id})`
      );
    } else if (missingFields.length > 0) {
      countModuleIssue(moduleStats, "jurusan");
      addHealthIssue(
        issues,
        "warning",
        "jurusan",
        `Data jurusan perlu dilengkapi: ${item.nama || "-"}`,
        `Field kosong: ${missingFields.join(", ")}.`,
        "jurusanPage",
        `editJurusan(${item.id})`
      );
    } else {
      goodCount++;
      countModuleGood(moduleStats, "jurusan");
    }
  });

  faqData.forEach(item => {
    const jawabanLength = getTextLength(item.jawaban);
    let isGood = true;

    if (!item.kategori) {
      isGood = false;
      countModuleIssue(moduleStats, "faq");
      addHealthIssue(
        issues,
        "warning",
        "faq",
        `FAQ tanpa kategori: ${item.pertanyaan || "-"}`,
        "Kategori membantu pengguna menemukan FAQ dengan lebih mudah.",
        "faqPage",
        `editFaq(${item.id})`
      );
    }

    if (jawabanLength < 80) {
      isGood = false;
      countModuleIssue(moduleStats, "faq");
      addHealthIssue(
        issues,
        "warning",
        "faq",
        `Jawaban FAQ terlalu pendek: ${item.pertanyaan || "-"}`,
        "Jawaban FAQ sebaiknya cukup jelas dan tidak terlalu singkat.",
        "faqPage",
        `editFaq(${item.id})`
      );
    }

    if (isGood) {
      goodCount++;
      countModuleGood(moduleStats, "faq");
    }
  });

  dokumenData.forEach(item => {
    let isGood = true;

    if (!item.link) {
      isGood = false;
      countModuleIssue(moduleStats, "dokumen");
      addHealthIssue(
        issues,
        "critical",
        "dokumen",
        `Dokumen tanpa link: ${item.judul || "-"}`,
        "Dokumen wajib memiliki link agar bisa dibuka pengguna.",
        "dokumenPage",
        `editDokumen(${item.id})`
      );
    }

    if (!item.deskripsi) {
      isGood = false;
      countModuleIssue(moduleStats, "dokumen");
      addHealthIssue(
        issues,
        "warning",
        "dokumen",
        `Dokumen tanpa deskripsi: ${item.judul || "-"}`,
        "Deskripsi membantu pengguna memahami isi dokumen.",
        "dokumenPage",
        `editDokumen(${item.id})`
      );
    }

    if (isGood) {
      goodCount++;
      countModuleGood(moduleStats, "dokumen");
    }
  });

  latestHealthIssues = issues;
  latestHealthModuleStats = moduleStats;

  const criticalCount = issues.filter(item => item.level === "critical").length;
  const warningCount = issues.filter(item => item.level === "warning").length;

  const totalChecks = goodCount + issues.length;
  const score = totalChecks
    ? Math.max(0, Math.round((goodCount / totalChecks) * 100))
    : 100;

  if (qs("healthScore")) qs("healthScore").textContent = `${score}%`;
  if (qs("healthCritical")) qs("healthCritical").textContent = criticalCount;
  if (qs("healthWarning")) qs("healthWarning").textContent = warningCount;
  if (qs("healthGood")) qs("healthGood").textContent = goodCount;

  renderHealthSummary(criticalCount, warningCount, issues);
  renderHealthModuleProgress(moduleStats);

  const selectedLevel = qs("healthFilter")?.value || "all";
  const selectedModule = qs("healthModuleFilter")?.value || "all";

  let visibleIssues = issues;

  if (selectedLevel !== "all") {
    visibleIssues = visibleIssues.filter(item => item.level === selectedLevel);
  }

  if (selectedModule !== "all") {
    visibleIssues = visibleIssues.filter(item => item.module === selectedModule);
  }

  container.innerHTML = visibleIssues.length
    ? visibleIssues.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.level === "critical" ? "Penting" : "Peringatan"}</span>
          <span class="pill">${getHealthModuleLabel(item.module)}</span>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </div>

        <div class="card-actions">
          ${
            item.editFunction
              ? `<button class="btn ghost" type="button" onclick="${item.editFunction}">Edit</button>`
              : ""
          }
        </div>
      </article>
    `).join("")
    : `<div class="empty">Website sehat. Tidak ada masalah utama yang terdeteksi.</div>`;
}

function calculateJurusanCompleteness(item) {
  let score = 0;
  let maxScore = 100;

  if (item.deskripsi) score += 20;
  if (item.prospek_kerja) score += 15;

  if (item.akreditasi) score += 10;
  if (item.website_resmi) score += 10;
  if (item.url_kurikulum) score += 10;
  if (item.url_akreditasi) score += 5;

  const hasStatistik = statistikData.some(
    s => Number(s.jurusan_id) === Number(item.id)
  );

  if (hasStatistik) score += 15;

  const hasBiaya = biayaPendidikanData.some(
    b =>
      b.nama_program_studi &&
      b.nama_program_studi.toLowerCase() === item.nama.toLowerCase()
  );

  if (hasBiaya) score += 10;

  const hasFaq = faqJurusanData.some(
    f => Number(f.jurusan_id) === Number(item.id)
  );

  if (hasFaq) score += 5;

  return Math.round((score / maxScore) * 100);
}

function renderJurusanCompletenessDashboard() {
  const topContainer = qs("jurusanCompletenessTop");
  const bottomContainer = qs("jurusanCompletenessBottom");

  if (!topContainer || !bottomContainer) return;

  const results = jurusanAdminData.map(item => ({
    ...item,
    completeness: calculateJurusanCompleteness(item)
  }));

  results.sort((a, b) => b.completeness - a.completeness);

  const avg =
    results.length
      ? Math.round(
          results.reduce(
            (sum, item) => sum + item.completeness,
            0
          ) / results.length
        )
      : 0;

  const completeCount =
    results.filter(
      item => item.completeness >= 90
    ).length;

  const incompleteCount =
    results.filter(
      item => item.completeness < 70
    ).length;

  qs("jurusanCompletenessAvg").textContent =
    `${avg}%`;

  qs("jurusanCompleteCount").textContent =
    completeCount;

  qs("jurusanIncompleteCount").textContent =
    incompleteCount;

  const topFive = results.slice(0, 5);

  const bottomFive =
    [...results]
      .sort((a, b) => a.completeness - b.completeness)
      .slice(0, 5);

  topContainer.innerHTML = `
    <article class="form-card">
      <h3>🏆 Jurusan Terlengkap</h3>

      ${topFive.map((item, index) => `
        <p>
          ${index + 1}. ${item.nama}
          <strong>${item.completeness}%</strong>
        </p>
      `).join("")}
    </article>
  `;

  bottomContainer.innerHTML = `
    <article class="form-card">
      <h3>⚠ Perlu Dilengkapi</h3>

      ${bottomFive.map((item, index) => `
        <p>
          ${index + 1}. ${item.nama}
          <strong>${item.completeness}%</strong>
        </p>
      `).join("")}
    </article>
  `;
}

function renderHealthSummary(criticalCount, warningCount, issues) {
  const container = qs("healthSummary");
  if (!container) return;

  const topIssues = issues.slice(0, 5);

  container.innerHTML = `
    <h3>Ringkasan Prioritas</h3>
    <p>
      🔥 ${criticalCount} masalah penting · 
      ⚠️ ${warningCount} peringatan
    </p>

    ${
      topIssues.length
        ? `
          <ol>
            ${topIssues.map(item => `
              <li>
                <strong>${getHealthModuleLabel(item.module)}:</strong>
                ${item.title}
              </li>
            `).join("")}
          </ol>
        `
        : `<p>Semua modul utama dalam kondisi baik.</p>`
    }
  `;
}

function renderHealthModuleProgress(moduleStats) {
  const container = qs("healthModuleProgress");
  if (!container) return;

  container.innerHTML = Object.keys(moduleStats).map(module => {
    const item = moduleStats[module];
    const total = item.good + item.issue;
    const score = total ? Math.round((item.good / total) * 100) : 100;

    return `
      <article class="admin-list-item">
        <div>
          <span class="pill">${getHealthModuleLabel(module)}</span>
          <h3>${score}%</h3>
          <p>${item.good} baik · ${item.issue} masalah</p>

          <div class="health-progress">
            <div class="health-progress-bar" style="width:${score}%"></div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function exportWebsiteHealthAudit(type = "csv") {
  const data = latestHealthIssues || [];

  if (!data.length) {
    alert("Tidak ada masalah kesehatan website untuk diekspor.");
    return;
  }

  if (type === "json") {
    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    downloadHealthFile(blob, "audit-kesehatan-website.json");
    return;
  }

  const headers = [
    "level",
    "module",
    "title",
    "description"
  ];

  const rows = data.map(item => [
    item.level,
    getHealthModuleLabel(item.module),
    item.title,
    item.description
  ]);

  const csv = [
    headers.join(","),
    ...rows.map(row =>
      row.map(value => `"${String(value || "").replace(/"/g, '""')}"`).join(",")
    )
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadHealthFile(blob, "audit-kesehatan-website.csv");
}

function downloadHealthFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

let healthFilterInitialized = false;

function initHealthFilters() {
  if (healthFilterInitialized) return;

  ["healthFilter", "healthModuleFilter"].forEach(id => {
    const element = qs(id);

    if (element) {
      element.addEventListener("change", renderWebsiteHealthDashboard);
    }
  });

  healthFilterInitialized = true;
}

function renderAll() {
  updateDashboardStats();
  initHealthFilters();
  renderWebsiteHealthDashboard();
  renderJurusanCompletenessDashboard();

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
     deadline: qs("jobDeadline").value || null,
     status: qs("jobStatus").value || "aktif",
     tipe_pekerjaan: qs("jobType").value || null,
     jenjang_pendidikan: qs("jobEducation").value || null,
     is_featured: qs("jobFeatured").checked,
     sumber: qs("jobSource").value || null,
     gaji_min: qs("jobSalaryMin").value ? Number(qs("jobSalaryMin").value) : null,
     gaji_max: qs("jobSalaryMax").value ? Number(qs("jobSalaryMax").value) : null,
     gaji_keterangan: qs("jobSalaryNote").value || null,
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
  [],
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
  updateDashboardStats();
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
  updateDashboardStats();
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
  qs("jobDeadline").value = item.deadline || "";
  qs("jobStatus").value = item.status || "aktif";
  qs("jobType").value = item.tipe_pekerjaan || "";
  qs("jobEducation").value = item.jenjang_pendidikan || "";
  qs("jobFeatured").checked = !!item.is_featured;
  qs("jobSource").value = item.sumber || "";
  qs("jobSalaryMin").value = item.gaji_min || "";
  qs("jobSalaryMax").value = item.gaji_max || "";
  qs("jobSalaryNote").value = item.gaji_keterangan || "";
  setEditorHTML("job", item.deskripsi || "");

await setSelectedRelations(
  "job",
  id,
  "",
  "",
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

function normalizeJalurValue(jalur) {
  const map = {
    snbp_snbt: "SNBP/SNBT",
    mandiri: "Mandiri",
    internasional: "Kelas Internasional",
    rpl: "RPL",
    reguler: "Reguler",
    dbr: "Doktor by Research",
    profesi: "Profesi"
  };

  return map[jalur] || jalur || "-";
}

function getBiayaAmountLabels(item) {
  const parts = [];

  if (item.ukt !== null && item.ukt !== undefined && item.ukt !== "") {
    parts.push(`UKT: <strong>${formatRupiah(item.ukt)}</strong>`);
  }

  if (item.ipi !== null && item.ipi !== undefined && item.ipi !== "") {
    parts.push(`IPI: <strong>${formatRupiah(item.ipi)}</strong>`);
  }

  if (item.uang_kuliah !== null && item.uang_kuliah !== undefined && item.uang_kuliah !== "") {
    parts.push(`Uang kuliah: <strong>${formatRupiah(item.uang_kuliah)}</strong>`);
  }

  return parts.length ? parts.join(" · ") : "Belum ada nominal";
}

async function loadBiayaPendidikanAdminData() {
  const { data, error } = await supabaseClient
    .from("biaya_pendidikan")
    .select("*")
    .order("tahun", { ascending: false })
    .order("jenjang", { ascending: true })
    .order("jalur", { ascending: true })
    .order("nama_prodi", { ascending: true })
    .order("kelompok", { ascending: true });

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

  const keyword = qs("biayaPendidikanSearch")?.value.toLowerCase() || "";

  const filtered = biayaPendidikanData.filter(item =>
    JSON.stringify(item).toLowerCase().includes(keyword)
  );

  list.innerHTML = filtered.length
    ? filtered.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.tahun || "-"}</span>
          <h3>${item.nama_prodi || "Program studi belum diisi"}</h3>
          <p>
            ${item.kode_prodi || "-"} ·
            ${item.jenjang || "-"} ·
            ${normalizeJalurValue(item.jalur)}
            ${item.kelompok ? ` · Kelompok ${item.kelompok}` : ""}
            ${item.status_mahasiswa ? ` · ${item.status_mahasiswa}` : ""}
          </p>
          <p>${getBiayaAmountLabels(item)}</p>
          ${item.catatan ? `<p>${item.catatan}</p>` : ""}
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
  const datalist = qs("biayaNamaProdiList");
  if (!datalist) return;

  datalist.innerHTML = jurusanAdminData.map(jurusan => `
    <option value="${jurusan.nama || ""}"></option>
  `).join("");
}

function getOptionalNumber(id) {
  const value = qs(id)?.value;
  return value === "" || value === null || value === undefined ? null : Number(value);
}

function getOptionalText(id) {
  const value = qs(id)?.value?.trim();
  return value ? value : null;
}

if (qs("biayaPendidikanForm")) {
  qs("biayaPendidikanForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("biayaId").value;

    const payload = {
      kode_prodi: qs("biayaKodeProdi").value.trim(),
      nama_prodi: qs("biayaNamaProdi").value.trim(),
      tahun: Number(qs("biayaTahun").value),
      jenjang: qs("biayaJenjang").value,
      jalur: qs("biayaJalur").value,
      kelompok: getOptionalNumber("biayaKelompok"),
      status_mahasiswa: getOptionalText("biayaStatusMahasiswa"),
      ukt: getOptionalNumber("biayaUkt"),
      ipi: getOptionalNumber("biayaIpi"),
      uang_kuliah: getOptionalNumber("biayaUangKuliah"),
      catatan: getOptionalText("biayaCatatan")
    };

    if (!payload.ukt && !payload.ipi && !payload.uang_kuliah) {
      alert("Isi minimal salah satu nominal: UKT, IPI, atau Uang Kuliah.");
      return;
    }

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
  qs("biayaKodeProdi").value = item.kode_prodi || "";
  qs("biayaNamaProdi").value = item.nama_prodi || "";
  qs("biayaTahun").value = item.tahun || 2026;
  qs("biayaJenjang").value = item.jenjang || "";
  qs("biayaJalur").value = item.jalur || "";
  qs("biayaKelompok").value = item.kelompok || "";
  qs("biayaStatusMahasiswa").value = item.status_mahasiswa || "";
  qs("biayaUkt").value = item.ukt ?? "";
  qs("biayaIpi").value = item.ipi ?? "";
  qs("biayaUangKuliah").value = item.uang_kuliah ?? "";
  qs("biayaCatatan").value = item.catatan || "";

  updateBiayaPreview();

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

  updateBiayaPreview();
}

function updateBiayaPreview() {
  const preview = qs("biayaPreview");
  if (!preview) return;

  const ukt = getOptionalNumber("biayaUkt");
  const ipi = getOptionalNumber("biayaIpi");
  const uangKuliah = getOptionalNumber("biayaUangKuliah");

  const parts = [];
  if (ukt) parts.push(`UKT ${formatRupiah(ukt)}`);
  if (ipi) parts.push(`IPI ${formatRupiah(ipi)}`);
  if (uangKuliah) parts.push(`Uang Kuliah ${formatRupiah(uangKuliah)}`);

  preview.textContent = parts.length ? parts.join(" · ") : "Rp0";
}

["biayaUkt", "biayaIpi", "biayaUangKuliah"].forEach(id => {
  const input = qs(id);
  if (input) input.addEventListener("input", updateBiayaPreview);
});

if (qs("biayaPendidikanSearch")) {
  qs("biayaPendidikanSearch").addEventListener("input", renderBiayaPendidikanAdminList);
}

/* =========================
   CRUD FAQ JURUSAN
========================= */

async function loadFaqJurusanData() {
  const { data, error } = await supabaseClient
    .from("faq_jurusan")
    .select("*, jurusan:jurusan_id(nama)")
    .order("urutan", { ascending: true });

  if (error) {
    alert("Gagal memuat FAQ jurusan: " + error.message);
    return;
  }

  faqJurusanData = data || [];
  renderFaqJurusanList();
}

function populateFaqJurusanOptions() {
  const select = qs("faqJurusanSelect");
  if (!select) return;

  select.innerHTML =
    `<option value="">Pilih jurusan</option>` +
    jurusanAdminData.map(item => `
      <option value="${item.id}">${item.nama}</option>
    `).join("");
}

function renderFaqJurusanList() {
  const list = qs("faqJurusanList");
  if (!list) return;

  list.innerHTML = faqJurusanData.length
    ? faqJurusanData.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.jurusan?.nama || "Jurusan"}</span>
          <h3>${item.pertanyaan}</h3>
          <p>${item.jawaban}</p>
          <small>Urutan: ${item.urutan || 0}</small>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editFaqJurusan(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteFaqJurusan(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada FAQ jurusan.</div>`;
}

if (qs("faqJurusanForm")) {
  qs("faqJurusanForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("faqJurusanId").value;

    const payload = {
      jurusan_id: Number(qs("faqJurusanSelect").value),
      pertanyaan: qs("faqJurusanPertanyaan").value,
      jawaban: qs("faqJurusanJawaban").value,
      urutan: Number(qs("faqJurusanUrutan").value || 0)
    };

    const response = id
      ? await supabaseClient.from("faq_jurusan").update(payload).eq("id", id)
      : await supabaseClient.from("faq_jurusan").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan FAQ jurusan: " + response.error.message);
      return;
    }

    clearFaqJurusanForm();
    await loadFaqJurusanData();
  });
}

function editFaqJurusan(id) {
  const item = faqJurusanData.find(row => row.id === id);
  if (!item) return;

  qs("faqJurusanId").value = item.id;
  qs("faqJurusanSelect").value = item.jurusan_id;
  qs("faqJurusanPertanyaan").value = item.pertanyaan || "";
  qs("faqJurusanJawaban").value = item.jawaban || "";
  qs("faqJurusanUrutan").value = item.urutan || 0;

  showAdminPage("faqJurusanPage");
}

async function deleteFaqJurusan(id) {
  if (!confirm("Yakin ingin menghapus FAQ jurusan ini?")) return;

  const { error } = await supabaseClient
    .from("faq_jurusan")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus FAQ jurusan: " + error.message);
    return;
  }

  await loadFaqJurusanData();
}

function clearFaqJurusanForm() {
  qs("faqJurusanForm")?.reset();
  if (qs("faqJurusanId")) qs("faqJurusanId").value = "";
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

if (qs("jobStatusFilter")) {
  qs("jobStatusFilter").addEventListener("change", renderAll);
}

if (qs("jobSalaryFilter")) {
  qs("jobSalaryFilter").addEventListener("change", renderAll);
}

/* =========================
   START
========================= */

initQuillEditors();
initSidebarNavigation();
checkSession();
