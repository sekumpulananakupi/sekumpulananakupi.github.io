/* =========================
   LOAD CONTENT
========================= */

async function loadInfoData() {
  const { data, error } = await supabaseClient
    .from("informasi_kampus")
    .select("id, judul, kategori, isi, gambar, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat info:", error.message);
    infoData = [];
    return;
  }

  infoData = data || [];
  resetAdminListPagination("info");
  renderList("info", "infoList", "infoSearch");
  updateDashboardStats();
}

async function loadWikiData() {
  const { data, error } = await supabaseClient
    .from("wiki_kampus")
    .select("id, judul, kategori, isi, gambar, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat wiki:", error.message);
    wikiData = [];
    return;
  }

  wikiData = data || [];
  resetAdminListPagination("wiki");
  renderList("wiki", "wikiList", "wikiSearch");
  updateDashboardStats();
}

async function loadJobData({ append = false } = {}) {
  const from = append ? adminJobPage * ADMIN_PAGE_SIZE : 0;
  const to = from + ADMIN_PAGE_SIZE - 1;

  const { data, error } = await supabaseClient
    .from("lowongan_kerja")
    .select(`
      id,
      posisi,
      perusahaan,
      lokasi,
      deskripsi,
      gambar,
      link,
      deadline,
      status,
      tipe_pekerjaan,
      jenjang_pendidikan,
      is_featured,
      sumber,
      gaji_min,
      gaji_max,
      gaji_keterangan,
      created_at
    `)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Gagal memuat lowongan:", error.message);
    if (!append) jobData = [];
    return;
  }

  const rows = data || [];

  jobData = append ? mergeAdminRowsById(jobData, rows) : rows;
  adminJobHasMore = rows.length === ADMIN_PAGE_SIZE;

  if (!append) {
    adminJobPage = 1;
    resetAdminListPagination("job");
  } else {
    adminJobPage += 1;
    adminListVisibleCount.job = jobData.length;
  }

  renderList("job", "jobList", "jobSearch");
  updateDashboardStats();
}

function mergeAdminRowsById(oldRows, newRows) {
  const map = new Map();
  [...oldRows, ...newRows].forEach(row => map.set(String(row.id), row));
  return Array.from(map.values());
}

async function loadArtikelJurusanData() {
  const { data, error } = await supabaseClient
    .from("artikel_jurusan")
    .select("artikel_id, jurusan_id")
    .eq("artikel_tipe", "job");

  if (error) {
    console.error("Gagal load relasi jurusan lowongan:", error.message);
    artikelJurusanData = [];
    return;
  }

  artikelJurusanData = data || [];
}

async function loadData() {
  await Promise.all([
    loadInfoData(),
    loadWikiData(),
    loadJobData()
  ]);
}
