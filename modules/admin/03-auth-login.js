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

let autoClosedJobsCount = 0;

async function autoCloseExpiredJobs() {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabaseClient
    .from("lowongan_kerja")
    .update({ status: "ditutup" })
    .lt("deadline", today)
    .neq("status", "ditutup")
    .select("id, posisi, deadline, status");

  if (error) {
    console.error("Auto close lowongan gagal:", error);
    autoClosedJobsCount = 0;
    return;
  }

  autoClosedJobsCount = data ? data.length : 0;

  if (qs("adminAutoClosedJobs")) {
    qs("adminAutoClosedJobs").textContent = autoClosedJobsCount;
  }

  if (autoClosedJobsCount > 0) {
    console.log(`${autoClosedJobsCount} lowongan expired otomatis ditutup.`);
  }
}

function getMonthLabel(dateString) {
  if (!dateString) return "Tanpa tanggal";

  const date = new Date(dateString);

  if (isNaN(date.getTime())) return "Tanpa tanggal";

  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric"
  });
}

async function refreshAdminData() {
  await autoCloseExpiredJobs();
  await preloadAdminFormOptions();
  await loadDashboardCounts();
}

async function preloadAdminFormOptions() {
  if (typeof loadMasterData === "function") {
    await loadMasterData();
  }

  if (typeof loadJurusanAdminData === "function") {
    await loadJurusanAdminData();
  }

  if (typeof populateFaqJurusanOptions === "function") {
    populateFaqJurusanOptions();
  }
}

async function loadDashboardCounts() {
  const [
    infoCount,
    wikiCount,
    jobCount,
    jurusanCount,
    dokumenCount,
    faqCount,
    kategoriCount,
    tagCount
  ] = await Promise.all([
    getTableCount("informasi_kampus"),
    getTableCount("wiki_kampus"),
    getTableCount("lowongan_kerja"),
    getTableCount("jurusan"),
    getTableCount("dokumen_kampus"),
    getTableCount("faq_kampus"),
    getTableCount("kategori"),
    getTableCount("tags")
  ]);

  setDashboardCount("adminCountInfo", infoCount);
  setDashboardCount("adminCountWiki", wikiCount);
  setDashboardCount("adminCountJobs", jobCount);
  setDashboardCount("adminCountJurusan", jurusanCount);
  setDashboardCount("adminCountDokumen", dokumenCount);
  setDashboardCount("adminCountFaq", faqCount);
  setDashboardCount("adminCountKategori", kategoriCount);
  setDashboardCount("adminCountTag", tagCount);
  setDashboardCount("adminCountTotal", infoCount + wikiCount + jobCount + dokumenCount + faqCount);
  setDashboardCount("adminAutoClosedJobs", autoClosedJobsCount || 0);
}

async function getTableCount(tableName) {
  const { count, error } = await supabaseClient
    .from(tableName)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error(`Gagal menghitung ${tableName}:`, error.message);
    return 0;
  }

  return count || 0;
}

function setDashboardCount(id, value) {
  const el = qs(id);
  if (el) el.textContent = value;
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
    updateDashboardStats();
  });
}

