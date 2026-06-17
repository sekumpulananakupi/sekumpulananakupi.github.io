const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/*
  LOWONGAN OPTIMIZED
  - Tidak lagi mengambil semua lowongan sekaligus
  - Per halaman hanya 5 lowongan
  - Query hanya kolom yang dipakai di card
  - Search dilakukan di Supabase, bukan filter ribuan data di browser
  - Filter jurusan/tag mengambil ID lowongan terkait dulu
  - Gambar lazy loading
  - Filter jurusan/tag dicache 5 menit
*/

const PAGE_SIZE = 5;
const CACHE_TTL = 5 * 60 * 1000;

let currentPage = 0;
let totalJobs = 0;
let activeJurusan = "all";
let activeTag = "all";
let currentKeyword = "";

let jurusanData = [];
let tagData = [];
let isLoadingJobs = false;

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

function stripHTML(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || div.innerText || "").trim();
}

function debounce(fn, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function getCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.time > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({
      time: Date.now(),
      data
    }));
  } catch {
    // Abaikan kalau storage penuh / tidak tersedia
  }
}

function showLoading(targetId, count = 5) {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = Array.from({ length: count }).map(() => `
    <article class="skeleton-card">
      <div class="skeleton-line title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </article>
  `).join("");
}

function showEmpty(targetId, title, message, icon = "💼") {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="empty">
      <div style="font-size:2rem;margin-bottom:.5rem;">${icon}</div>
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

function setButtonLoading(isLoading) {
  const btn = document.getElementById("loadMoreJobs");
  if (!btn) return;

  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Memuat..." : "Muat Lowongan Lainnya";
}

function renderLoadMoreButton() {
  const wrapper = document.getElementById("jobPagination");
  if (!wrapper) return;

  const loaded = Math.min((currentPage + 1) * PAGE_SIZE, totalJobs);

  if (loaded >= totalJobs) {
    wrapper.innerHTML = totalJobs
      ? `<p class="muted">Semua lowongan sudah ditampilkan.</p>`
      : "";
    return;
  }

  wrapper.innerHTML = `
    <button id="loadMoreJobs" class="btn ghost" type="button">
      Muat Lowongan Lainnya
    </button>
    <p class="muted">Menampilkan ${loaded} dari ${totalJobs} lowongan.</p>
  `;

  document.getElementById("loadMoreJobs").addEventListener("click", () => {
    currentPage += 1;
    loadJobs({ append: true });
  });
}

async function loadFilterData() {
  const cachedJurusan = getCache("lowongan_jurusan_filter_v1");
  const cachedTags = getCache("lowongan_tag_filter_v1");

  if (cachedJurusan && cachedTags) {
    jurusanData = cachedJurusan;
    tagData = cachedTags;
    renderFilters();
    return;
  }

  const [jurusanResult, tagResult] = await Promise.all([
    supabaseClient
      .from("jurusan")
      .select("id,nama")
      .order("nama", { ascending: true }),

    supabaseClient
      .from("tags")
      .select("id,nama")
      .order("nama", { ascending: true })
  ]);

  jurusanData = jurusanResult.data || [];
  tagData = tagResult.data || [];

  setCache("lowongan_jurusan_filter_v1", jurusanData);
  setCache("lowongan_tag_filter_v1", tagData);

  renderFilters();
}

function renderFilters() {
  const jurusanFilter = document.getElementById("jurusanFilter");
  const tagFilter = document.getElementById("tagFilter");

  if (jurusanFilter) {
    jurusanFilter.innerHTML =
      `<option value="all">Semua Jurusan</option>` +
      jurusanData
        .map(item => `<option value="${item.id}">${escapeHTML(item.nama)}</option>`)
        .join("");

    jurusanFilter.value = activeJurusan;
  }

  if (tagFilter) {
    tagFilter.innerHTML =
      `<option value="all">Semua Tag</option>` +
      tagData
        .map(item => `<option value="${item.id}">${escapeHTML(item.nama)}</option>`)
        .join("");

    tagFilter.value = activeTag;
  }
}

async function getFilteredJobIds() {
  let jurusanIds = null;
  let tagIds = null;

  if (activeJurusan !== "all") {
    const { data } = await supabaseClient
      .from("artikel_jurusan")
      .select("artikel_id")
      .eq("artikel_tipe", "job")
      .eq("jurusan_id", activeJurusan);

    jurusanIds = new Set((data || []).map(row => row.artikel_id));
  }

  if (activeTag !== "all") {
    const { data } = await supabaseClient
      .from("artikel_tags")
      .select("artikel_id")
      .eq("artikel_tipe", "job")
      .eq("tag_id", activeTag);

    tagIds = new Set((data || []).map(row => row.artikel_id));
  }

  if (!jurusanIds && !tagIds) return null;

  let finalIds = [];

  if (jurusanIds && tagIds) {
    finalIds = [...jurusanIds].filter(id => tagIds.has(id));
  } else if (jurusanIds) {
    finalIds = [...jurusanIds];
  } else if (tagIds) {
    finalIds = [...tagIds];
  }

  return finalIds;
}

function buildJobsQuery(jobIds) {
  const from = currentPage * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabaseClient
    .from("lowongan_kerja")
    .select("id,posisi,perusahaan,lokasi,gambar,deskripsi,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (currentKeyword) {
    const safeKeyword = currentKeyword.replaceAll("%", "").replaceAll(",", " ");
    query = query.or(
      `posisi.ilike.%${safeKeyword}%,perusahaan.ilike.%${safeKeyword}%,lokasi.ilike.%${safeKeyword}%,deskripsi.ilike.%${safeKeyword}%`
    );
  }

  if (Array.isArray(jobIds)) {
    if (!jobIds.length) return null;
    query = query.in("id", jobIds);
  }

  return query;
}

async function loadJobs({ append = false } = {}) {
  if (isLoadingJobs) return;
  isLoadingJobs = true;

  const list = document.getElementById("jobList");

  if (!append) {
    currentPage = 0;
    showLoading("jobList", PAGE_SIZE);
  } else {
    setButtonLoading(true);
  }

  try {
    const filteredJobIds = await getFilteredJobIds();
    const query = buildJobsQuery(filteredJobIds);

    if (!query) {
      totalJobs = 0;
      showEmpty(
        "jobList",
        "Lowongan tidak ditemukan",
        "Coba gunakan kata kunci, tag, atau jurusan lain.",
        "💼"
      );
      renderLoadMoreButton();
      return;
    }

    const { data, error, count } = await query;

    if (error) throw error;

    totalJobs = count || 0;
    const html = (data || []).map(createJobCard).join("");

    if (append && list) {
      list.insertAdjacentHTML("beforeend", html);
    } else if (list) {
      list.innerHTML = html || "";
    }

    if (!data?.length && !append) {
      showEmpty(
        "jobList",
        "Lowongan tidak ditemukan",
        "Coba gunakan kata kunci, tag, atau jurusan lain.",
        "💼"
      );
    }

    renderLoadMoreButton();
  } catch (error) {
    console.error("Gagal memuat lowongan:", error);
    showEmpty(
      "jobList",
      "Gagal memuat lowongan",
      "Coba refresh halaman atau cek koneksi Supabase.",
      "⚠️"
    );
  } finally {
    isLoadingJobs = false;
    setButtonLoading(false);
  }
}

function createJobCard(item) {
  const excerpt = stripHTML(item.deskripsi).slice(0, 140);

  return `
    <article class="item-card">
      ${item.gambar ? `
        <img
          src="${escapeHTML(item.gambar)}"
          class="card-image"
          alt="${escapeHTML(item.posisi)}"
          loading="lazy"
          decoding="async"
        >
      ` : ""}

      <span class="pill">${escapeHTML(item.perusahaan || "Lowongan")}</span>
      <span class="pill">${escapeHTML(item.lokasi || "Fleksibel")}</span>

      <h3>${escapeHTML(item.posisi)}</h3>
      <p>${escapeHTML(excerpt)}${excerpt.length >= 140 ? "..." : ""}</p>

      <a href="post.html?type=job&id=${item.id}" class="btn ghost">Lihat Detail</a>
    </article>
  `;
}

function initEvents() {
  const searchInput = document.getElementById("jobSearch");
  const jurusanFilter = document.getElementById("jurusanFilter");
  const tagFilter = document.getElementById("tagFilter");

  if (searchInput) {
    const params = new URLSearchParams(window.location.search);
    const keyword = params.get("q") || "";

    searchInput.value = keyword;
    currentKeyword = keyword.trim().toLowerCase();

    searchInput.addEventListener("input", debounce(event => {
      currentKeyword = event.target.value.trim().toLowerCase();
      loadJobs();
    }, 350));
  }

  if (jurusanFilter) {
    jurusanFilter.addEventListener("change", event => {
      activeJurusan = event.target.value;
      loadJobs();
    });
  }

  if (tagFilter) {
    tagFilter.addEventListener("change", event => {
      activeTag = event.target.value;
      loadJobs();
    });
  }
}

async function initLowonganPage() {
  showLoading("jobList", PAGE_SIZE);

  initEvents();

  await Promise.all([
    loadFilterData(),
    loadJobs()
  ]);
}

initLowonganPage();
