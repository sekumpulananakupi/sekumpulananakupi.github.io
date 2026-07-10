const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let admissionChart = null;

/* =========================
   HELPERS
========================= */

function showLoading(targetId, count = 3) {
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

function showSimpleLoading(targetId, message = "Memuat data...") {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      ${escapeHTML(message)}
    </div>
  `;
}

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

function toTitleCase(text) {
  return String(text || "")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatNumber(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return "0";
  return number.toLocaleString("id-ID");
}

function formatRupiah(value) {
  if (value === null || value === undefined || value === "") return "-";

  const number = Number(value);
  if (Number.isNaN(number)) return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(number);
}

function renderLineList(text, emptyText = "Belum tersedia.") {
  const items = String(text || "")
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);

  if (!items.length) {
    return `<div class="empty">${escapeHTML(emptyText)}</div>`;
  }

  return `
    <ul>
      ${items.map(item => `<li>${escapeHTML(item)}</li>`).join("")}
    </ul>
  `;
}

function renderChipLinks(text) {
  const items = String(text || "")
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);

  if (!items.length) {
    return `<div class="empty">Prospek kerja belum tersedia.</div>`;
  }

  return `
    <div class="career-grid">
      ${items.map(item => `
        <a class="career-card" href="../pages/lowongan.html?q=${encodeURIComponent(item)}">
          <span class="career-icon"><i class="fa-solid fa-briefcase" aria-hidden="true"></i></span>
          <span>${escapeHTML(item)}</span>
        </a>
      `).join("")}
    </div>
  `;
}

function renderCocokUntukSiapa(text) {
  const items = String(text || "")
    .split("\n")
    .map(item => item.trim())
    .filter(Boolean);

  if (!items.length) {
    return `<div class="empty">Data kecocokan jurusan belum tersedia.</div>`;
  }

  return `
    <div class="fit-list">
      ${items.map(item => `
        <div class="fit-item">
          <span><i class="fa-solid fa-check" aria-hidden="true"></i></span>
          <p>${escapeHTML(item)}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function getLatestStatistik(statistik = []) {
  if (!Array.isArray(statistik) || !statistik.length) return null;
  return statistik.slice().sort((a, b) => Number(b.tahun) - Number(a.tahun))[0];
}

function getBiayaRangeText(biayaList = []) {
  const values = biayaList
    .flatMap(item => [item.ukt, item.ipi, item.uang_kuliah])
    .map(Number)
    .filter(value => !Number.isNaN(value) && value > 0);

  if (!values.length) return "Belum tersedia";

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) return formatRupiah(min);
  return `${formatRupiah(min)} - ${formatRupiah(max)}`;
}

function setupDetailNav() {
  document.querySelectorAll(".detail-jump-nav a").forEach(link => {
    link.addEventListener("click", event => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function setupMobileDetailNav() {
  const navLinks = document.querySelectorAll(".mobile-detail-nav a");

  if (!navLinks.length) return;

  navLinks.forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      const target = document.querySelector(this.getAttribute("href"));

      if (!target) return;

      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      navLinks.forEach(item => item.classList.remove("active"));
      this.classList.add("active");
    });
  });

  const sections = ["profil", "statistik", "biaya", "faq", "prospek", "mirip"]
    .map(id => document.getElementById(id))
    .filter(Boolean);

  window.addEventListener("scroll", () => {
    let currentId = "";

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();

      if (rect.top <= 160) {
        currentId = section.id;
      }
    });

    if (!currentId) return;

    navLinks.forEach(link => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${currentId}`
      );
    });
  });
}

function setupSectionJump() {

  const sectionJump = document.getElementById("sectionJump");

  if (!sectionJump) return;

  sectionJump.addEventListener("change", function () {

    const target = document.querySelector(this.value);

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  });

}

function makeSafeId(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* =========================
   STATISTIK HELPERS
========================= */

function getPersentaseKeterimaan(item) {
  const dayaTampung = Number(item?.daya_tampung || 0);
  const peminat = Number(item?.peminat || 0);

  if (!dayaTampung || !peminat) return 0;

  return (dayaTampung / peminat) * 100;
}

function formatPersentaseKeterimaan(item) {
  return getPersentaseKeterimaan(item).toFixed(2);
}

function getRasioPersaingan(item) {
  const dayaTampung = Number(item?.daya_tampung || 0);
  const peminat = Number(item?.peminat || 0);

  if (!dayaTampung || !peminat) return "-";

  const rasio = peminat / dayaTampung;
  return `1 : ${rasio.toFixed(1).replace(".", ",")}`;
}

function getTrendText(data) {
  if (!Array.isArray(data) || data.length < 2) {
    return "Belum cukup data untuk membaca tren.";
  }

  const latest = data[data.length - 1];
  const previous = data[data.length - 2];

  const latestPeminat = Number(latest.peminat || 0);
  const previousPeminat = Number(previous.peminat || 0);

  const latestRate = getPersentaseKeterimaan(latest);
  const previousRate = getPersentaseKeterimaan(previous);

  if (!previousPeminat) {
    return "Tren belum bisa dihitung karena data tahun sebelumnya belum lengkap.";
  }

  const peminatChange = ((latestPeminat - previousPeminat) / previousPeminat) * 100;
  const rateChange = latestRate - previousRate;

  const peminatText = peminatChange > 0
    ? `Peminat naik ${Math.abs(peminatChange).toFixed(1).replace(".", ",")}% dibanding ${previous.tahun}.`
    : peminatChange < 0
      ? `Peminat turun ${Math.abs(peminatChange).toFixed(1).replace(".", ",")}% dibanding ${previous.tahun}.`
      : `Peminat relatif stabil dibanding ${previous.tahun}.`;

  const persainganText = rateChange < 0
    ? "Persaingan terlihat makin ketat."
    : rateChange > 0
      ? "Peluang keterimaan terlihat lebih longgar."
      : "Tingkat keterimaan relatif stabil.";

  return `${peminatText} ${persainganText}`;
}

function getLatestByJalur(statistik, jalur) {
  const data = statistik
    .filter(item => String(item.jalur || "").toUpperCase() === jalur)
    .sort((a, b) => Number(a.tahun) - Number(b.tahun));

  return data.length ? data[data.length - 1] : null;
}

/* =========================
   LOAD DETAIL JURUSAN
========================= */

async function loadJurusanDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const detail = document.getElementById("jurusanDetail");
  const relatedArticleList = document.getElementById("relatedArticleList");
  const relatedJobList = document.getElementById("relatedJobList");

  showSimpleLoading("jurusanDetail", "Memuat detail jurusan...");
  showLoading("relatedArticleList", 3);
  showLoading("relatedJobList", 3);

  if (!detail) return;

  if (!id) {
    detail.innerHTML = typeof renderSolutionEmptyState === "function"
      ? renderSolutionEmptyState({
        title: "Jurusan tidak ditemukan.",
        message: "Buka daftar jurusan untuk memilih profil yang tersedia.",
        resetLabel: "Buka daftar jurusan",
        suggestions: [{ label: "Bandingkan jurusan", href: "../pages/bandingkan-jurusan.html" }]
      })
      : `<div class="empty">Jurusan tidak ditemukan.</div>`;
    if (typeof bindDataRecoveryActions === "function") {
      bindDataRecoveryActions(detail, { reset: () => { window.location.href = "../pages/jurusan.html"; } });
    }
    return;
  }

const jurusanCacheKey = `jurusan_detail_${id}_v1`;
let jurusan = getCache(jurusanCacheKey, 1440);

let error = null;

if (!jurusan) {
  const result = await supabaseClient
    .from("jurusan")
    .select(`
      id,
      nama,
      fakultas,
      jenjang,
      akreditasi,
      deskripsi,
      cocok_untuk,
      gelar,
      website_resmi,
      url_kurikulum,
      url_akreditasi,
      prospek_kerja
    `)
    .eq("id", id)
    .single();

  jurusan = result.data;
  error = result.error;

  if (jurusan) {
    setCache(jurusanCacheKey, jurusan);
  }
}

  if (error || !jurusan) {
    console.error("Gagal memuat jurusan:", error?.message);
    detail.innerHTML = typeof renderDataRecoveryState === "function"
      ? renderDataRecoveryState({
        title: "Detail jurusan belum dapat dimuat.",
        message: "Coba lagi atau segarkan data. Jika masalah berlanjut, laporkan agar kami dapat memeriksanya.",
        reportHref: "../pages/hubungi-kami.html?subject=laporan-data-jurusan"
      })
      : `<div class="empty">Gagal memuat jurusan.</div>`;
    if (typeof bindDataRecoveryActions === "function") {
      bindDataRecoveryActions(detail, {
        retry: () => loadJurusanDetail(),
        refresh: () => { clearSaupiCache(jurusanCacheKey); loadJurusanDetail(); }
      });
    }
    return;
  }

  const { data: biayaPendidikan, error: biayaError } = await supabaseClient
    .from("biaya_pendidikan")
    .select("tahun, jalur, kelompok, status_mahasiswa, ukt, ipi, uang_kuliah")
    .eq("jurusan_id", jurusan.id)
    .order("tahun", { ascending: false })
    .order("jalur", { ascending: true })
    .order("kelompok", { ascending: true });

  if (biayaError) {
    console.error("Gagal memuat biaya pendidikan:", biayaError.message);
  }

const { data: faqJurusan, error: faqError } = await supabaseClient
    .from("faq_jurusan")
    .select("pertanyaan, jawaban, urutan")
    .eq("jurusan_id", jurusan.id)
    .order("urutan", { ascending: true });

  if (faqError) {
    console.error("Gagal memuat FAQ jurusan:", faqError.message);
  }

  const statistik = await loadStatistikJurusan(id);
   
   updateSeoJurusan(
  jurusan,
  statistik,
  Array.isArray(biayaPendidikan) ? biayaPendidikan : []
);

   updateStructuredDataJurusan(
  jurusan,
  statistik,
  Array.isArray(biayaPendidikan) ? biayaPendidikan : []
);
  
  updateBreadcrumbSchemaJurusan(jurusan);

  updateFaqSchemaJurusan(faqJurusan || []);

  const biayaList = Array.isArray(biayaPendidikan) ? biayaPendidikan : [];
  const latestStat = getLatestStatistik(statistik);
  const latestSNBP = getLatestByJalur(statistik, "SNBP");
  const latestSNBT = getLatestByJalur(statistik, "SNBT");
  const mainStat = latestSNBT || latestSNBP || latestStat;

  detail.innerHTML = `
    <nav class="breadcrumb detail-breadcrumb" aria-label="Breadcrumb">
      <a href="../index.html">Beranda</a>
      <span aria-hidden="true"><i class="fa-solid fa-chevron-right"></i></span>
      <a href="../pages/jurusan.html">Jurusan</a>
      <span aria-hidden="true"><i class="fa-solid fa-chevron-right"></i></span>
      <span aria-current="page">${escapeHTML(jurusan.nama)}</span>
    </nav>

    <article class="jurusan-detail-shell">
      <section class="jurusan-hero-card">
        <div class="hero-copy">
          <div class="hero-pill-row">
            <span class="pill">${escapeHTML(jurusan.fakultas || "UPI")}</span>
            <span class="pill soft-pill">${escapeHTML(jurusan.jenjang || "S1")}</span>
            ${jurusan.akreditasi ? `<span class="pill accent-pill">Akreditasi ${escapeHTML(jurusan.akreditasi)}</span>` : ""}
          </div>

          <h1>${escapeHTML(jurusan.nama)}</h1>
          <p class="hero-lead">
            ${escapeHTML(stripHTML(jurusan.deskripsi || "Temukan profil jurusan, daya tampung, peminat, biaya pendidikan, FAQ, prospek kerja, dan jurusan mirip di UPI.")).slice(0, 220)}${String(stripHTML(jurusan.deskripsi || "")).length > 220 ? "..." : ""}
          </p>

          <div class="hero-actions">
            <a href="#statistik" class="btn primary">Lihat Statistik</a>
            <a href="../pages/bandingkan-jurusan.html" class="btn ghost">Bandingkan Jurusan</a>
          </div>
        </div>

        <aside class="hero-summary-card" aria-label="Ringkasan jurusan">
          <div class="summary-main">
            <span>Peluang terbaru</span>
            <strong>${mainStat ? `${formatPersentaseKeterimaan(mainStat)}%` : "-"}</strong>
            <small>${mainStat ? `${escapeHTML(mainStat.jalur || "")} ${escapeHTML(mainStat.tahun || "")}` : "Data belum tersedia"}</small>
          </div>

          <div class="mini-stat-grid">
            <div>
              <span>Daya tampung</span>
              <strong>${mainStat ? formatNumber(mainStat.daya_tampung) : "-"}</strong>
            </div>
            <div>
              <span>Peminat</span>
              <strong>${mainStat ? formatNumber(mainStat.peminat) : "-"}</strong>
            </div>
            <div>
              <span>Rasio</span>
              <strong>${mainStat ? getRasioPersaingan(mainStat) : "-"}</strong>
            </div>
            <div>
              <span>Gelar</span>
              <strong>${escapeHTML(jurusan.gelar || "-")}</strong>
            </div>
          </div>
        </aside>
      </section>

      ${typeof renderMajorJourneyActions === "function" ? renderMajorJourneyActions({
        id: jurusan.id,
        name: jurusan.nama,
        faculty: jurusan.fakultas
      }) : ""}
 
      <div class="mobile-section-select">
  <label for="sectionJump">Lompat ke bagian</label>
  <select id="sectionJump">
    <option value="#profil">Profil Jurusan</option>
    <option value="#statistik">Statistik Penerimaan</option>
    <option value="#biaya">Biaya Pendidikan</option>
    <option value="#faq">FAQ Jurusan</option>
    <option value="#prospek">Prospek Kerja</option>
    <option value="#jurusan-mirip">Jurusan Mirip</option>
  </select>
</div>

<nav class="desktop-section-nav">
  <a href="#profil">Profil</a>
  <a href="#statistik">Statistik</a>
  <a href="#biaya">Biaya</a>
  <a href="#faq">FAQ</a>
  <a href="#prospek">Prospek</a>
  <a href="#jurusan-mirip">Mirip</a>
</nav>

      <section class="quick-facts-card">
        <div>
          <span>Akreditasi</span>
          <strong>${escapeHTML(jurusan.akreditasi || "-")}</strong>
        </div>
        <div>
          <span>Jenjang</span>
          <strong>${escapeHTML(jurusan.jenjang || "-")}</strong>
        </div>
        <div>
          <span>Fakultas</span>
          <strong>${escapeHTML(jurusan.fakultas || "-")}</strong>
        </div>
        <div>
          <span>Estimasi biaya</span>
          <strong>${escapeHTML(getBiayaRangeText(biayaList))}</strong>
        </div>
      </section>

      <section id="profil" class="detail-section-card">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">Profil</p>
            <h2>Gambaran Jurusan</h2>
          </div>
        </div>
        <div class="post-content compact-content">
          ${escapeHTML(jurusan.deskripsi || "Deskripsi jurusan belum tersedia.").replace(/\n/g, "<br>")}
        </div>
      </section>

      <section class="detail-section-card">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">Kecocokan</p>
            <h2>Cocok Untuk Siapa?</h2>
          </div>
        </div>
        ${renderCocokUntukSiapa(jurusan.cocok_untuk)}
      </section>

      <section class="detail-section-card">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">Program</p>
            <h2>Informasi Program Studi</h2>
          </div>
        </div>

        <div class="jurusan-info-grid modern-info-grid">
          <div class="stat-card"><span>Akreditasi</span><strong>${escapeHTML(jurusan.akreditasi || "-")}</strong></div>
          <div class="stat-card"><span>Jenjang</span><strong>${escapeHTML(jurusan.jenjang || "-")}</strong></div>
          <div class="stat-card"><span>Fakultas</span><strong>${escapeHTML(jurusan.fakultas || "-")}</strong></div>
          <div class="stat-card"><span>Gelar Lulusan</span><strong>${escapeHTML(jurusan.gelar || "-")}</strong></div>
        </div>

        <div class="program-links modern-link-row">
          ${jurusan.website_resmi ? `<a href="${escapeHTML(jurusan.website_resmi)}" target="_blank" rel="noopener noreferrer" class="btn ghost">Website Resmi</a>` : ""}
          ${jurusan.url_kurikulum ? `<a href="${escapeHTML(jurusan.url_kurikulum)}" target="_blank" rel="noopener noreferrer" class="btn-link"><i class="fa-solid fa-book-open" aria-hidden="true"></i> Lihat Kurikulum</a>` : ""}
          ${jurusan.url_akreditasi ? `<a href="${escapeHTML(jurusan.url_akreditasi)}" target="_blank" rel="noopener noreferrer" class="btn-link"><i class="fa-regular fa-file-lines" aria-hidden="true"></i> Lihat Akreditasi</a>` : ""}
        </div>
      </section>

      <section id="statistik" class="detail-section-card highlight-section">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">Seleksi Masuk</p>
            <h2>Statistik Penerimaan</h2>
          </div>
          <span class="section-hint">SNBP & SNBT</span>
        </div>
        ${renderStatistik(statistik)}
      </section>

      <section id="biaya" class="detail-section-card">
        ${renderBiayaPendidikanSection(biayaList)}
      </section>

      <section id="faq" class="detail-section-card">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">Pertanyaan Umum</p>
            <h2>FAQ Jurusan</h2>
          </div>
        </div>
        ${renderFaqJurusan(faqJurusan || [])}
      </section>

      <section id="mirip" class="detail-section-card related-jurusan-section">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">Eksplorasi</p>
            <h2>Jurusan Mirip</h2>
          </div>
        </div>
        <div id="relatedJurusanList" class="related-grid">
          <div class="loading-state">Mencari jurusan yang mirip...</div>
        </div>
      </section>

      <section id="prospek" class="detail-section-card">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">Karier</p>
            <h2>Prospek Kerja</h2>
          </div>
          <a class="btn ghost small-btn" href="../pages/lowongan.html">Cari Lowongan</a>
        </div>
        ${renderChipLinks(jurusan.prospek_kerja)}
      </section>

      <section class="detail-section-card final-action-card">
        <div>
          <p class="eyebrow">Bagikan</p>
          <h2>Simpan atau bagikan halaman ini</h2>
          <p>Gunakan halaman ini sebagai referensi saat membandingkan jurusan UPI.</p>
        </div>

        <div class="share-actions">
          <button id="shareWhatsapp" class="btn primary" type="button"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i> Bagikan Jurusan</button>
          <button id="copyLink" class="btn ghost" type="button"><i class="fa-solid fa-link" aria-hidden="true"></i> Salin Link</button>
          <a href="../pages/jurusan.html" class="btn ghost"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Daftar Jurusan</a>
        </div>
      </section>
      <nav class="mobile-detail-nav">
  <a href="#profil">
    <i class="fa-solid fa-user"></i>
    <span>Profil</span>
  </a>

  <a href="#statistik">
    <i class="fa-solid fa-chart-line"></i>
    <span>Stat</span>
  </a>

  <a href="#biaya">
    <i class="fa-solid fa-wallet"></i>
    <span>Biaya</span>
  </a>

  <a href="#faq">
    <i class="fa-solid fa-circle-question"></i>
    <span>FAQ</span>
  </a>

  <a href="#prospek">
    <i class="fa-solid fa-briefcase"></i>
    <span>Karier</span>
  </a>

  <a href="#mirip">
    <i class="fa-solid fa-code-compare"></i>
    <span>Mirip</span>
  </a>
</nav>
    </article>
  `;

setupShareButtons();
setupDetailNav();
setupMobileDetailNav();
setupAdmissionStatistik(statistik);

document.querySelectorAll(".mobile-detail-nav a").forEach(link => {
  link.addEventListener("click", function (e) {
    e.preventDefault();

    const target = document.querySelector(this.getAttribute("href"));

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
});

  await loadRelatedContent(id, relatedArticleList, relatedJobList);
  await loadAutoMatchedJobs(jurusan, relatedJobList);
  await loadRelatedJurusan(jurusan);
}

async function loadStatistikJurusan(jurusanId) {
  const cacheKey = `statistik_jurusan_detail_${jurusanId}_v1`;
  const cached = getCache(cacheKey, 1440);

  if (cached) return cached;

  const { data, error } = await supabaseClient
    .from("statistik_jurusan")
    .select("tahun, jalur, daya_tampung, peminat")
    .eq("jurusan_id", jurusanId)
    .order("tahun", { ascending: false });

  if (error) {
    console.error("Gagal memuat statistik jurusan:", error.message);
    return [];
  }

  setCache(cacheKey, data || []);
  return data || [];
}

/* =========================
   RENDER STATISTIK
========================= */

function renderStatistik(statistik) {
  if (!Array.isArray(statistik) || !statistik.length) {
    return `<div class="empty">Statistik jurusan belum tersedia.</div>`;
  }

  return `
    <section class="admission-section">
      <div class="admission-tabs">
        <button type="button" class="admission-tab active" data-jalur="SNBP">SNBP</button>
        <button type="button" class="admission-tab" data-jalur="SNBT">SNBT</button>
      </div>

      <div class="admission-compare" id="admissionCompare"></div>

      <div class="admission-summary" id="admissionSummary"></div>

      <div class="admission-trend" id="admissionTrend"></div>

      <div class="admission-controls">
        <button type="button" class="chart-mode-btn active" data-mode="jumlah">
          Daya Tampung & Peminat
        </button>

        <button type="button" class="chart-mode-btn" data-mode="persentase">
          Persentase Keterimaan
        </button>

        <button type="button" class="chart-mode-btn" data-mode="rasio">
          Rasio Persaingan
        </button>
      </div>

      <div class="admission-card">
        <canvas id="admissionChart"></canvas>
      </div>

      <div class="admission-table-wrap">
        <table class="admission-table">
          <thead>
            <tr>
              <th>Tahun</th>
              <th>Daya Tampung</th>
              <th>Peminat</th>
              <th>Keterimaan</th>
              <th>Rasio</th>
            </tr>
          </thead>
          <tbody id="admissionTableBody"></tbody>
        </table>
      </div>
    </section>
  `;
}

function setupAdmissionStatistik(statistik) {
  const tabs = document.querySelectorAll(".admission-tab");
  const modeButtons = document.querySelectorAll(".chart-mode-btn");
  const tbody = document.getElementById("admissionTableBody");
  const canvas = document.getElementById("admissionChart");
  const summary = document.getElementById("admissionSummary");
  const trend = document.getElementById("admissionTrend");
  const compare = document.getElementById("admissionCompare");

  if (!tabs.length || !tbody || !canvas) return;

  let activeJalur = "SNBP";
  let activeMode = "jumlah";

  renderCompare();

  function renderCompare() {
    if (!compare) return;

    const latestSNBP = getLatestByJalur(statistik, "SNBP");
    const latestSNBT = getLatestByJalur(statistik, "SNBT");

    if (!latestSNBP && !latestSNBT) {
      compare.innerHTML = "";
      return;
    }

    compare.innerHTML = `
      <div class="admission-compare-grid">
        ${renderCompareCard("SNBP", latestSNBP)}
        ${renderCompareCard("SNBT", latestSNBT)}
      </div>
    `;
  }

  function renderCompareCard(label, item) {
    if (!item) {
      return `
        <div class="admission-compare-card">
          <span>${label}</span>
          <strong>Belum tersedia</strong>
          <small>Data jalur ini belum ada.</small>
        </div>
      `;
    }

    return `
      <div class="admission-compare-card">
        <span>${label} ${escapeHTML(item.tahun)}</span>
        <strong>${formatPersentaseKeterimaan(item)}%</strong>
        <small>
          ${formatNumber(item.peminat)} peminat /
          ${formatNumber(item.daya_tampung)} kursi ·
          Rasio ${getRasioPersaingan(item)}
        </small>
      </div>
    `;
  }

  function renderAdmission() {
    const data = statistik
      .filter(item => String(item.jalur || "").toUpperCase() === activeJalur)
      .sort((a, b) => Number(a.tahun) - Number(b.tahun));

    if (admissionChart) {
      admissionChart.destroy();
      admissionChart = null;
    }

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-statistik">
            Data ${activeJalur} belum tersedia.
          </td>
        </tr>
      `;

      if (summary) {
        summary.innerHTML = `<div class="empty">Ringkasan belum tersedia.</div>`;
      }

      if (trend) {
        trend.innerHTML = "";
      }

      return;
    }

    const latest = data[data.length - 1];

    if (summary) {
      summary.innerHTML = `
        <div class="admission-summary-card">
          <span>Tahun Terbaru</span>
          <strong>${escapeHTML(latest.tahun)}</strong>
        </div>

        <div class="admission-summary-card">
          <span>Daya Tampung</span>
          <strong>${formatNumber(latest.daya_tampung)}</strong>
        </div>

        <div class="admission-summary-card">
          <span>Peminat</span>
          <strong>${formatNumber(latest.peminat)}</strong>
        </div>

        <div class="admission-summary-card">
          <span>Persentase Keterimaan</span>
          <strong>${formatPersentaseKeterimaan(latest)}%</strong>
        </div>

        <div class="admission-summary-card">
          <span>Rasio Persaingan</span>
          <strong>${getRasioPersaingan(latest)}</strong>
        </div>
      `;
    }

    if (trend) {
      trend.innerHTML = `
        <div class="info-note">
          <strong>Analisis Tren:</strong>
          ${escapeHTML(getTrendText(data))}
        </div>
      `;
    }

    const labels = data.map(item => item.tahun);
    const dayaTampung = data.map(item => Number(item.daya_tampung || 0));
    const peminat = data.map(item => Number(item.peminat || 0));
    const persentase = data.map(item => Number(formatPersentaseKeterimaan(item)));
    const rasio = data.map(item => {
      const dt = Number(item.daya_tampung || 0);
      const pm = Number(item.peminat || 0);
      return dt ? Number((pm / dt).toFixed(2)) : 0;
    });

    const datasets = getDatasets(activeMode, dayaTampung, peminat, persentase, rasio);

    if (typeof Chart === "undefined") {
      canvas.parentElement.innerHTML = `
        <div class="empty">
          Chart.js belum terbaca. Pastikan script Chart.js sudah dipasang di HTML.
        </div>
      `;
    } else {
      admissionChart = new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets
        },
        options: getChartOptions(activeMode)
      });
    }

    tbody.innerHTML = data
      .slice()
      .sort((a, b) => Number(b.tahun) - Number(a.tahun))
      .map(item => `
        <tr>
          <td>${escapeHTML(item.tahun)}</td>
          <td>${formatNumber(item.daya_tampung)} kursi</td>
          <td>${formatNumber(item.peminat)} peminat</td>
          <td><strong>${formatPersentaseKeterimaan(item)}%</strong></td>
          <td>${getRasioPersaingan(item)}</td>
        </tr>
      `)
      .join("");
  }

  function getDatasets(mode, dayaTampung, peminat, persentase, rasio) {
    if (mode === "jumlah") {
      return [
        {
          type: "bar",
          label: "Daya Tampung",
          data: dayaTampung,
          yAxisID: "y"
        },
        {
          type: "line",
          label: "Peminat",
          data: peminat,
          yAxisID: "y",
          tension: 0.35
        }
      ];
    }

    if (mode === "persentase") {
      return [
        {
          type: "line",
          label: "Persentase Keterimaan (%)",
          data: persentase,
          yAxisID: "y",
          tension: 0.35
        }
      ];
    }

    return [
      {
        type: "line",
        label: "Rasio Persaingan",
        data: rasio,
        yAxisID: "y",
        tension: 0.35
      }
    ];
  }

  function getChartOptions(mode) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: context => {
              const label = context.dataset.label || "";
              const value = Number(context.raw || 0);

              if (mode === "persentase") {
                return `${label}: ${value.toFixed(2)}%`;
              }

              if (mode === "rasio") {
                return `${label}: 1 : ${value.toFixed(1).replace(".", ",")}`;
              }

              return `${label}: ${value.toLocaleString("id-ID")}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => {
              if (mode === "persentase") return `${value}%`;
              if (mode === "rasio") return `1 : ${String(value).replace(".", ",")}`;
              return Number(value).toLocaleString("id-ID");
            }
          }
        }
      }
    };
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", function () {
      tabs.forEach(item => item.classList.remove("active"));
      this.classList.add("active");

      activeJalur = String(this.dataset.jalur || "SNBP").toUpperCase();
      renderAdmission();
    });
  });

  modeButtons.forEach(button => {
    button.addEventListener("click", function () {
      modeButtons.forEach(item => item.classList.remove("active"));
      this.classList.add("active");

      activeMode = this.dataset.mode || "jumlah";
      renderAdmission();
    });
  });

  renderAdmission();
}

/* =========================
   RELATED CONTENT
========================= */

async function loadRelatedContent(jurusanId, relatedArticleList, relatedJobList) {
  if (!relatedArticleList || !relatedJobList) return;

  const cacheKey = `related_content_jurusan_${jurusanId}_v1`;
  const cached = getCache(cacheKey, 1440);

  if (cached) {
    relatedArticleList.innerHTML = cached.articlesHTML;
    relatedJobList.innerHTML = cached.jobsHTML;
    return;
  }

  const { data: relasi, error } = await supabaseClient
    .from("artikel_jurusan")
    .select("artikel_id, artikel_tipe")
    .eq("jurusan_id", jurusanId);

  if (error) {
    console.error("Gagal memuat relasi artikel jurusan:", error.message);
  }

  if (!relasi || !relasi.length) {
    relatedArticleList.innerHTML = `<div class="empty">Belum ada artikel terkait.</div>`;
    relatedJobList.innerHTML = `<div class="empty">Belum ada lowongan terkait.</div>`;

    setCache(cacheKey, {
      articlesHTML: relatedArticleList.innerHTML,
      jobsHTML: relatedJobList.innerHTML
    });

    return;
  }

  const infoIds = relasi
    .filter(row => row.artikel_tipe === "info")
    .map(row => row.artikel_id);

  const wikiIds = relasi
    .filter(row => row.artikel_tipe === "wiki")
    .map(row => row.artikel_id);

  const jobIds = relasi
    .filter(row => row.artikel_tipe === "job")
    .map(row => row.artikel_id);

  const [infoResult, wikiResult, jobResult] = await Promise.all([
    infoIds.length
      ? supabaseClient
          .from("informasi_kampus")
          .select("id, judul, isi, gambar")
          .in("id", infoIds)
      : Promise.resolve({ data: [], error: null }),

    wikiIds.length
      ? supabaseClient
          .from("wiki_kampus")
          .select("id, judul, isi, gambar")
          .in("id", wikiIds)
      : Promise.resolve({ data: [], error: null }),

    jobIds.length
      ? supabaseClient
          .from("lowongan_kerja")
          .select("id, posisi, perusahaan, deskripsi, gambar")
          .in("id", jobIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (infoResult.error) {
    console.error("Gagal memuat artikel info terkait:", infoResult.error.message);
  }

  if (wikiResult.error) {
    console.error("Gagal memuat wiki terkait:", wikiResult.error.message);
  }

  if (jobResult.error) {
    console.error("Gagal memuat lowongan terkait:", jobResult.error.message);
  }

  const articles = [
    ...(infoResult.data || []).map(item => ({
      ...item,
      type: "info"
    })),

    ...(wikiResult.data || []).map(item => ({
      ...item,
      type: "wiki"
    }))
  ];

  const jobs = (jobResult.data || []).map(item => ({
    ...item,
    type: "job"
  }));

  relatedArticleList.innerHTML = articles.length
    ? articles.map(createRelatedCard).join("")
    : `<div class="empty">Belum ada artikel terkait.</div>`;

  relatedJobList.innerHTML = jobs.length
    ? jobs.map(createRelatedCard).join("")
    : `<div class="empty">Belum ada lowongan terkait.</div>`;

  setCache(cacheKey, {
    articlesHTML: relatedArticleList.innerHTML,
    jobsHTML: relatedJobList.innerHTML
  });
}

function createRelatedCard(item) {
  let title = "";
  let content = "";
  let label = "";
  let href = "#";

  if (item.type === "info" || item.type === "wiki") {
    title = item.judul;
    content = item.isi;
    label = item.type === "info" ? "Info Kampus" : "Wiki Kampus";
    href = `../pages/post.html?type=${encodeURIComponent(item.type)}&id=${encodeURIComponent(item.id)}`;
  }

  if (item.type === "job") {
    title = item.posisi;
    content = item.deskripsi;
    label = item.perusahaan || "Lowongan";
    href = `../pages/post.html?type=job&id=${encodeURIComponent(item.id)}`;
  }

  return `
    <article class="clean-related-card" ${item.type === "job" ? `data-job-id="${escapeHTML(item.id)}"` : ""}>
      ${item.gambar ? `
        <img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(title)}">
      ` : ""}

      <span class="pill">${escapeHTML(label)}</span>

      ${item.matchLabel ? `
        <span class="pill tag-pill">${escapeHTML(item.matchLabel)}</span>
      ` : ""}

      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(stripHTML(content)).slice(0, 120)}...</p>
      <a href="${href}" class="btn ghost">Baca Detail</a>
    </article>
  `;
}

/* =========================
   AUTO MATCHED JOBS
========================= */

function getProspekList(jurusan) {
  return String(jurusan.prospek_kerja || "")
    .split("\n")
    .map(item => item.trim().toLowerCase())
    .filter(item => item.length >= 4);
}

async function loadAutoMatchedJobs(jurusan, relatedJobList) {
  if (!relatedJobList) return;

  const prospekList = getProspekList(jurusan);
  if (!prospekList.length) return;

  const cacheKey = `auto_jobs_jurusan_${jurusan.id}_v2`;
  const cached = getCache(cacheKey, 720);

  if (cached) {
    renderAutoMatchedJobs(cached, relatedJobList);
    return;
  }

  const searchTerms = prospekList
    .slice(0, 6)
    .map(term => term.replace(/[%_]/g, "").trim())
    .filter(Boolean);

  if (!searchTerms.length) return;

  const orQuery = searchTerms
    .map(term => {
      const safe = term.replace(/[(),]/g, " ");
      return `posisi.ilike.%${safe}%,perusahaan.ilike.%${safe}%,deskripsi.ilike.%${safe}%`;
    })
    .join(",");

  const { data: jobs, error: jobsError } = await supabaseClient
    .from("lowongan_kerja")
    .select("id, posisi, perusahaan, deskripsi, gambar, created_at")
    .or(orQuery)
    .order("created_at", { ascending: false })
    .limit(8);

  if (jobsError) {
    console.error("Gagal memuat lowongan kerja otomatis:", jobsError.message);
    return;
  }

  const matchedJobs = (jobs || [])
    .map(job => {
      const jobText = `
        ${job.posisi || ""}
        ${job.perusahaan || ""}
        ${stripHTML(job.deskripsi || "")}
      `.toLowerCase();

      const matchedProspek = prospekList.find(prospek => jobText.includes(prospek));

      if (!matchedProspek) return null;

      return {
        ...job,
        type: "job",
        matchedProspek
      };
    })
    .filter(Boolean);

  setCache(cacheKey, matchedJobs);
  renderAutoMatchedJobs(matchedJobs, relatedJobList);
}

function renderAutoMatchedJobs(matchedJobs, relatedJobList) {
  if (!matchedJobs || !matchedJobs.length || !relatedJobList) return;

  const existingJobIds = new Set(
    Array.from(relatedJobList.querySelectorAll("[data-job-id]"))
      .map(card => Number(card.dataset.jobId))
  );

  const uniqueMatchedJobs = matchedJobs.filter(job => !existingJobIds.has(Number(job.id)));
  if (!uniqueMatchedJobs.length) return;

  const existingHTML = relatedJobList.innerHTML;

  relatedJobList.innerHTML = `
    ${uniqueMatchedJobs.map(job => createRelatedCard({
      ...job,
      type: "job",
      matchLabel: `Cocok dengan: ${toTitleCase(job.matchedProspek)}`
    })).join("")}

    ${existingHTML.includes("Belum ada lowongan") ? "" : existingHTML}
  `;
}

/* =========================
   BIAYA PENDIDIKAN
========================= */

function renderBiayaPendidikanSection(biayaList = []) {
  console.log("Jumlah biaya yang dirender:", biayaList.length, biayaList);

  if (!Array.isArray(biayaList) || biayaList.length === 0) {
    return `
      <section class="biaya-section">
        <h2>Biaya Pendidikan</h2>
        <p>Data biaya pendidikan belum tersedia.</p>
        ${renderBiayaDisclaimer()}
      </section>
    `;
  }

  const jalurUrutan = [
    { key: "SNBP/SNBT", label: "SNBP/SNBT" },
    { key: "Mandiri", label: "Seleksi Mandiri" },
    { key: "RPL", label: "RPL" },
    { key: "Kelas Internasional", label: "Kelas Internasional" },
    { key: "Reguler", label: "Reguler" },
    { key: "DbR", label: "Doktor by Research" },
    { key: "Profesi", label: "Profesi" }
  ];

  const jalurTersedia = jalurUrutan.filter(jalur =>
    biayaList.some(item => item.jalur === jalur.key)
  );

  if (!jalurTersedia.length) {
    return `
      <section class="biaya-section">
        <h2>Biaya Pendidikan</h2>
        <p>Data biaya pendidikan belum tersedia.</p>
        ${renderBiayaDisclaimer()}
      </section>
    `;
  }

  return `
    <section class="biaya-section">
      <h2>Biaya Pendidikan</h2>

      <div class="biaya-tabs">
        ${jalurTersedia.map((jalur, index) => `
          <button
            type="button"
            class="biaya-tab-btn ${index === 0 ? "active" : ""}"
            data-biaya-tab="${escapeHTML(jalur.key)}"
          >
            ${escapeHTML(jalur.label)}
          </button>
        `).join("")}
      </div>

      ${jalurTersedia.map((jalur, index) => `
        <div
          class="biaya-tab-content ${index === 0 ? "active" : ""}"
          id="biaya-${makeSafeId(jalur.key)}"
        >
          ${renderJalurBiayaTable(biayaList, jalur.key)}
        </div>
      `).join("")}

      ${renderBiayaDisclaimer()}
    </section>
  `;
}

function renderJalurBiayaTable(biayaList, jalur) {
  const items = biayaList.filter(item => item.jalur === jalur);

  if (!items.length) {
    return `<div class="empty">Data belum tersedia.</div>`;
  }

  return `
    <div class="biaya-card-grid">
      ${items.map(item => `
        <div class="biaya-card">
          ${
            item.kelompok
              ? `<div class="biaya-title">Kelompok ${escapeHTML(item.kelompok)}</div>`
              : item.status_mahasiswa
                ? `<div class="biaya-title">${escapeHTML(item.status_mahasiswa)}</div>`
                : `<div class="biaya-title">${escapeHTML(jalur)}</div>`
          }

          ${
            item.ukt
              ? `
                <div class="biaya-item">
                  <span>UKT</span>
                  <strong>${formatRupiah(item.ukt)}</strong>
                </div>
              `
              : ""
          }

          ${
            item.ipi
              ? `
                <div class="biaya-item">
                  <span>IPI</span>
                  <strong>${formatRupiah(item.ipi)}</strong>
                </div>
              `
              : ""
          }

          ${
            item.uang_kuliah
              ? `
                <div class="biaya-item">
                  <span>Biaya</span>
                  <strong>${formatRupiah(item.uang_kuliah)}</strong>
                </div>
              `
              : ""
          }
        </div>
      `).join("")}
    </div>
  `;
}

function setupBiayaTabs() {
  const buttons = document.querySelectorAll(".biaya-tab-btn");

  buttons.forEach(button => {
    button.addEventListener("click", function () {
      const jalur = this.dataset.biayaTab;
      const targetId = `biaya-${makeSafeId(jalur)}`;

      document.querySelectorAll(".biaya-tab-content").forEach(content => {
        content.classList.remove("active");
      });

      document.querySelectorAll(".biaya-tab-btn").forEach(btn => {
        btn.classList.remove("active");
      });

      const target = document.getElementById(targetId);
      if (target) target.classList.add("active");

      this.classList.add("active");
    });
  });
}

function renderBiayaDisclaimer() {
  return `
    <div class="info-note">
      <strong>Catatan:</strong>
      Informasi biaya pendidikan dapat berbeda berdasarkan jenjang dan jalur masuk,
      seperti SNBP/SNBT, Seleksi Mandiri, Kelas Internasional, RPL, Pascasarjana,
      dan Pendidikan Profesi. Data yang ditampilkan merupakan referensi Tahun Akademik 2026.
      Untuk informasi terbaru dan resmi, silakan cek situs PMB UPI.
    </div>

    <a
      href="https://pmb.upi.edu/biaya_pendidikan"
      target="_blank"
      rel="noopener noreferrer"
      class="btn secondary"
    >
      Cek Biaya Pendidikan Resmi UPI
    </a>
  `;
}

/* =========================
   FAQ JURUSAN
========================= */

function renderFaqJurusan(items = []) {
  if (!items.length) {
    return `<div class="empty">FAQ jurusan belum tersedia.</div>`;
  }

  return `
    <section class="faq-jurusan-section">
      ${items.map(item => `
        <details class="faq-jurusan-item">
          <summary>${escapeHTML(item.pertanyaan)}</summary>
          <div class="faq-jurusan-answer">
            ${escapeHTML(item.jawaban).replace(/\n/g, "<br>")}
          </div>
        </details>
      `).join("")}
    </section>
  `;
}

/* =========================
   SHARE BUTTONS
========================= */

function setupShareButtons() {
  const shareBtn = document.getElementById("shareWhatsapp");
  const copyBtn = document.getElementById("copyLink");

  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      const url = window.location.href;

      window.open(
        `https://wa.me/?text=${encodeURIComponent(url)}`,
        "_blank"
      );
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);

        copyBtn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Link Tersalin';

        setTimeout(() => {
          copyBtn.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i> Salin Link';
        }, 2000);
      } catch {
        alert("Gagal menyalin link.");
      }
    });
  }
}

/* =========================
   JURUSAN RELATED
========================= */


async function loadRelatedJurusan(currentJurusan) {

  const container =
    document.getElementById("relatedJurusanList");

  if (!container) return;

  const { data: jurusanList } =
    await supabaseClient
     .from("jurusan")
     .select("id, nama, fakultas, jenjang");

  if (!jurusanList?.length) {
    container.innerHTML =
      `<div class="empty">Belum ada jurusan lain.</div>`;
    return;
  }

  const currentNama =
    (currentJurusan.nama || "").toLowerCase();

  const related = jurusanList
    .filter(item => item.id !== currentJurusan.id)
    .map(item => {

      let score = 0;

      if (
        item.fakultas === currentJurusan.fakultas
      ) {
        score += 5;
      }

      if (
        item.jenjang === currentJurusan.jenjang
      ) {
        score += 3;
      }

      const nama =
        (item.nama || "").toLowerCase();

      const keywords = currentNama
        .replace(/\(.*?\)/g, "")
        .split(" ")
        .filter(word => word.length >= 4);

      keywords.forEach(keyword => {
        if (nama.includes(keyword)) {
          score += 2;
        }
      });

      return {
        ...item,
        score
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (!related.length) {
    container.innerHTML =
      `<div class="empty">Belum ditemukan jurusan yang mirip.</div>`;
    return;
  }

  container.innerHTML = related.map(item => `
    <article class="related-jurusan-card">

      <span class="pill">
        ${escapeHTML(item.fakultas)}
      </span>

      <span class="pill">
        ${escapeHTML(item.jenjang)}
      </span>

      <h3>
        ${escapeHTML(item.nama)}
      </h3>

      <a
        href="../pages/jurusan-detail.html?id=${item.id}"
        class="btn ghost"
      >
        Lihat Jurusan
      </a>

    </article>
  `).join("");
}


/* =========================
   SEO
========================= */
function updateSeoJurusan(jurusan, statistik = [], biayaList = []) {
  const nama = jurusan.nama || "Jurusan UPI";
  const fakultas = jurusan.fakultas || "Universitas Pendidikan Indonesia";
  const jenjang = jurusan.jenjang || "";
  const akreditasi = jurusan.akreditasi || "";

  const latest = statistik
    .slice()
    .sort((a, b) => Number(b.tahun) - Number(a.tahun))[0];

  const tahun = latest?.tahun || "terbaru";
  const dayaTampung = latest?.daya_tampung || null;
  const peminat = latest?.peminat || null;

  const biayaValues = biayaList
    .flatMap(item => [item.ukt, item.ipi, item.uang_kuliah])
    .map(Number)
    .filter(value => !Number.isNaN(value) && value > 0);

  const minBiaya = biayaValues.length ? Math.min(...biayaValues) : null;
  const maxBiaya = biayaValues.length ? Math.max(...biayaValues) : null;

  const title = `${nama} UPI: Akreditasi, UKT, Daya Tampung, Peminat`;

  let description = `Informasi ${nama} ${jenjang} UPI di ${fakultas}.`;

  if (akreditasi) {
    description += ` Akreditasi ${akreditasi}.`;
  }

  if (dayaTampung && peminat) {
    description += ` Data penerimaan ${tahun}: daya tampung ${dayaTampung} kursi dan ${peminat} peminat.`;
  }

  if (minBiaya && maxBiaya) {
    description += ` Biaya pendidikan mulai dari ${formatRupiah(minBiaya)} sampai ${formatRupiah(maxBiaya)}.`;
  }

  description += ` Lihat profil jurusan, kurikulum, statistik penerimaan, biaya kuliah, FAQ, dan prospek kerja.`;

  const canonicalUrl = getCanonicalUrl();
  const imageUrl = "https://anakupi.my.id/assets/images/og-default.svg";

  document.title = title;

  setCanonicalUrl(canonicalUrl);
  setMetaTag("description", description);
  setMetaTag("og:title", title, "property");
  setMetaTag("og:description", description, "property");
  setMetaTag("og:type", "article", "property");
  setMetaTag("og:site_name", "Sekumpulan Anak UPI", "property");
  setMetaTag("og:url", canonicalUrl, "property");
  setMetaTag("og:image", imageUrl, "property");
  setMetaTag("og:locale", "id_ID", "property");
  setMetaTag("twitter:card", "summary_large_image");
  setMetaTag("twitter:title", title);
  setMetaTag("twitter:description", description);
  setMetaTag("twitter:image", imageUrl);
}

function getCanonicalUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  return url.toString();
}

function setCanonicalUrl(url) {
  let link = document.querySelector('link[rel="canonical"]');

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", url);
}

function setMetaTag(name, content, attr = "name") {
  if (!content) return;

  let tag = document.querySelector(`meta[${attr}="${name}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function updateStructuredDataJurusan(jurusan, statistik = [], biayaList = []) {
  const oldSchema = document.getElementById("jurusanSchema");
  if (oldSchema) oldSchema.remove();

  const latest = statistik
    .slice()
    .sort((a, b) => Number(b.tahun) - Number(a.tahun))[0];

  const biayaValues = biayaList
    .flatMap(item => [item.ukt, item.ipi, item.uang_kuliah])
    .map(Number)
    .filter(value => !Number.isNaN(value) && value > 0);

  const minBiaya = biayaValues.length ? Math.min(...biayaValues) : null;
  const maxBiaya = biayaValues.length ? Math.max(...biayaValues) : null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalProgram",
    "name": `${jurusan.nama || "Jurusan UPI"}`,
    "provider": {
      "@type": "CollegeOrUniversity",
      "name": "Universitas Pendidikan Indonesia",
      "url": "https://www.upi.edu"
    },
    "educationalCredentialAwarded": jurusan.jenjang || undefined,
    "description": stripHTML(jurusan.deskripsi || ""),
    "url": window.location.href,
    "programPrerequisites": "Lulusan SMA/SMK/MA/sederajat sesuai ketentuan penerimaan UPI",
    "occupationalCategory": jurusan.prospek_kerja || undefined
  };

  if (jurusan.fakultas) {
    schema.department = {
      "@type": "EducationalOrganization",
      "name": jurusan.fakultas
    };
  }

  if (jurusan.akreditasi) {
    schema.additionalProperty = [
      {
        "@type": "PropertyValue",
        "name": "Akreditasi",
        "value": jurusan.akreditasi
      }
    ];
  }

  if (latest) {
    schema.maximumEnrollment = Number(latest.daya_tampung || 0) || undefined;

    schema.additionalProperty = [
      ...(schema.additionalProperty || []),
      {
        "@type": "PropertyValue",
        "name": `Daya tampung ${latest.jalur || ""} ${latest.tahun || ""}`.trim(),
        "value": String(latest.daya_tampung || "")
      },
      {
        "@type": "PropertyValue",
        "name": `Peminat ${latest.jalur || ""} ${latest.tahun || ""}`.trim(),
        "value": String(latest.peminat || "")
      }
    ];
  }

  if (minBiaya && maxBiaya) {
    schema.offers = {
      "@type": "Offer",
      "priceCurrency": "IDR",
      "price": minBiaya,
      "description": `Biaya pendidikan berkisar dari ${formatRupiah(minBiaya)} sampai ${formatRupiah(maxBiaya)}.`
    };
  }

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "jurusanSchema";
  script.textContent = JSON.stringify(schema, null, 2);

  document.head.appendChild(script);
}

function updateBreadcrumbSchemaJurusan(jurusan) {
  const oldSchema = document.getElementById("breadcrumbSchema");
  if (oldSchema) oldSchema.remove();

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Beranda",
        "item": `${window.location.origin}/../index.html`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Jurusan",
        "item": `${window.location.origin}/../pages/jurusan.html`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": jurusan.nama || "Detail Jurusan",
        "item": window.location.href
      }
    ]
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "breadcrumbSchema";
  script.textContent = JSON.stringify(schema, null, 2);

  document.head.appendChild(script);
}

function updateFaqSchemaJurusan(faqItems = []) {
  const oldSchema = document.getElementById("faqSchema");
  if (oldSchema) oldSchema.remove();

  if (!Array.isArray(faqItems) || !faqItems.length) return;

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(item => ({
      "@type": "Question",
      "name": item.pertanyaan || "",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": stripHTML(item.jawaban || "")
      }
    }))
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "faqSchema";
  script.textContent = JSON.stringify(schema, null, 2);

  document.head.appendChild(script);
}


/* =========================
   INIT
========================= */

async function initJurusanDetailPage() {
  await loadJurusanDetail();
  if (typeof setupMajorJourneyActions === "function") setupMajorJourneyActions();
  setupBiayaTabs();
}

initJurusanDetailPage();
