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
    <div class="prospek-chip-group">
      ${items.map(item => `
        <a class="pill prospek-chip" href="lowongan.html?q=${encodeURIComponent(item)}">
          ${escapeHTML(item)}
        </a>
      `).join("")}
    </div>
  `;
}

function renderCocokUntukSiapa(text) {
  return renderLineList(text, "Data kecocokan jurusan belum tersedia.");
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
    detail.innerHTML = `<div class="empty">Jurusan tidak ditemukan.</div>`;
    return;
  }

  const { data: jurusan, error } = await supabaseClient
    .from("jurusan")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !jurusan) {
    console.error("Gagal memuat jurusan:", error?.message);
    detail.innerHTML = `<div class="empty">Gagal memuat jurusan.</div>`;
    return;
  }

  const { data: biayaPendidikan, error: biayaError } = await supabaseClient
    .from("biaya_pendidikan")
    .select("*")
    .eq("jurusan_id", jurusan.id)
    .order("tahun", { ascending: false })
    .order("jalur", { ascending: true })
    .order("kelompok", { ascending: true });

  if (biayaError) {
    console.error("Gagal memuat biaya pendidikan:", biayaError.message);
  }

  const { data: faqJurusan, error: faqError } = await supabaseClient
    .from("faq_jurusan")
    .select("*")
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

  detail.innerHTML = `
  <nav class="breadcrumb">
  <a href="index.html">Beranda</a>
  <span>›</span>
  <a href="jurusan.html">Jurusan</a>
  <span>›</span>
  <span>${escapeHTML(jurusan.nama)}</span>
   </nav>
    <article class="post-card">
      <span class="pill">${escapeHTML(jurusan.fakultas || "UPI")}</span>
      <h1>${escapeHTML(jurusan.nama)}</h1>
      <p class="post-date">${escapeHTML(jurusan.jenjang || "S1")}</p>

      <h2>Profil Jurusan</h2>
      <div class="post-content">
        ${escapeHTML(jurusan.deskripsi || "Deskripsi jurusan belum tersedia.").replace(/\n/g, "<br>")}
      </div>

      <h2>Cocok Untuk Siapa?</h2>
      ${renderCocokUntukSiapa(jurusan.cocok_untuk)}

      <h2>Informasi Program Studi</h2>
      <div class="jurusan-info-grid">
        <div class="stat-card">
          <span>Akreditasi</span>
          <strong>${escapeHTML(jurusan.akreditasi || "-")}</strong>
        </div>

        <div class="stat-card">
          <span>Jenjang</span>
          <strong>${escapeHTML(jurusan.jenjang || "-")}</strong>
        </div>

        <div class="stat-card">
          <span>Fakultas</span>
          <strong>${escapeHTML(jurusan.fakultas || "-")}</strong>
        </div>
      </div>

      <div class="stat-card">
        <span>Gelar Lulusan</span>
        <strong>${escapeHTML(jurusan.gelar || "-")}</strong>
      </div>
      
      ${jurusan.website_resmi ? `
        <a href="${escapeHTML(jurusan.website_resmi)}" target="_blank" rel="noopener noreferrer" class="btn ghost">
          Website Resmi
        </a>
      ` : ""}

      <div class="program-links">
        ${jurusan.url_kurikulum ? `
          <a href="${escapeHTML(jurusan.url_kurikulum)}" target="_blank" rel="noopener noreferrer" class="btn-link">
            📚 Lihat Kurikulum
          </a>
        ` : ""}

        ${jurusan.url_akreditasi ? `
          <a href="${escapeHTML(jurusan.url_akreditasi)}" target="_blank" rel="noopener noreferrer" class="btn-link">
            📄 Lihat Akreditasi
          </a>
        ` : ""}
      </div>

      <h2>Statistik Penerimaan</h2>
      ${renderStatistik(statistik)}

      ${renderBiayaPendidikanSection(Array.isArray(biayaPendidikan) ? biayaPendidikan : [])}

      <h2>FAQ Jurusan</h2>
      ${renderFaqJurusan(faqJurusan || [])}

      <section class="related-jurusan-section">
        <h2>Jurusan Mirip</h2>
      
        <div id="relatedJurusanList" class="related-grid">
          <div class="loading-state">
            Mencari jurusan yang mirip...
          </div>
        </div>
      </section>

      <h2>Prospek Kerja</h2>
      ${renderChipLinks(jurusan.prospek_kerja)}

      <div class="share-actions">
        <button id="shareWhatsapp" class="btn primary">
          📤 Bagikan Jurusan
        </button>

        <button id="copyLink" class="btn ghost">
          🔗 Salin Link
        </button>
      </div>

      <a href="jurusan.html" class="btn ghost">← Kembali ke Daftar Jurusan</a>
    </article>
  `;

  setupShareButtons();
  setupAdmissionStatistik(statistik);

  await loadRelatedContent(id, relatedArticleList, relatedJobList);
  await loadAutoMatchedJobs(jurusan, relatedJobList);
  await loadRelatedJurusan(jurusan);
}

async function loadStatistikJurusan(jurusanId) {
  const { data, error } = await supabaseClient
    .from("statistik_jurusan")
    .select("*")
    .eq("jurusan_id", jurusanId)
    .order("tahun", { ascending: false });

  if (error) {
    console.error("Gagal memuat statistik jurusan:", error.message);
    return [];
  }

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

  const { data: relasi, error } = await supabaseClient
    .from("artikel_jurusan")
    .select("*")
    .eq("jurusan_id", jurusanId);

  if (error) {
    console.error("Gagal memuat relasi artikel jurusan:", error.message);
  }

  if (!relasi || !relasi.length) {
    relatedArticleList.innerHTML = `<div class="empty">Belum ada artikel terkait.</div>`;
    relatedJobList.innerHTML = `<div class="empty">Belum ada lowongan terkait.</div>`;
    return;
  }

  const articles = [];
  const jobs = [];

  for (const row of relasi) {
    let table = "";

    if (row.artikel_tipe === "info") table = "informasi_kampus";
    if (row.artikel_tipe === "wiki") table = "wiki_kampus";
    if (row.artikel_tipe === "job") table = "lowongan_kerja";

    if (!table) continue;

    const { data, error: itemError } = await supabaseClient
      .from(table)
      .select("*")
      .eq("id", row.artikel_id)
      .single();

    if (itemError) {
      console.error(`Gagal memuat ${table}:`, itemError.message);
      continue;
    }

    if (!data) continue;

    const item = {
      ...data,
      type: row.artikel_tipe
    };

    if (row.artikel_tipe === "job") {
      jobs.push(item);
    } else {
      articles.push(item);
    }
  }

  relatedArticleList.innerHTML = articles.length
    ? articles.map(createRelatedCard).join("")
    : `<div class="empty">Belum ada artikel terkait.</div>`;

  relatedJobList.innerHTML = jobs.length
    ? jobs.map(createRelatedCard).join("")
    : `<div class="empty">Belum ada lowongan terkait.</div>`;
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
    href = `post.html?type=${encodeURIComponent(item.type)}&id=${encodeURIComponent(item.id)}`;
  }

  if (item.type === "job") {
    title = item.posisi || item.judul;
    content = item.deskripsi;
    label = item.perusahaan || "Lowongan";
    href = `post.html?type=job&id=${encodeURIComponent(item.id)}`;
  }

  return `
    <article class="item-card" ${item.type === "job" ? `data-job-id="${escapeHTML(item.id)}"` : ""}>
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

  const { data: jobs, error: jobsError } = await supabaseClient
    .from("lowongan_kerja")
    .select("*")
    .order("created_at", { ascending: false });

  if (jobsError) {
    console.error("Gagal memuat lowongan kerja:", jobsError.message);
    return;
  }

  const { data: tagRows, error: tagRowsError } = await supabaseClient
    .from("artikel_tags")
    .select("artikel_id, tag_id")
    .eq("artikel_tipe", "job");

  if (tagRowsError) {
    console.error("Gagal memuat relasi tag lowongan:", tagRowsError.message);
  }

  const { data: tags, error: tagsError } = await supabaseClient
    .from("tags")
    .select("*");

  if (tagsError) {
    console.error("Gagal memuat tags:", tagsError.message);
  }

  const matchedJobs = (jobs || [])
    .map(job => {
      const jobText = `
        ${job.posisi || ""}
        ${job.judul || ""}
        ${job.perusahaan || ""}
        ${stripHTML(job.deskripsi || "")}
      `.toLowerCase();

      const tagNames = (tagRows || [])
        .filter(row => row.artikel_id === job.id)
        .map(row => (tags || []).find(tag => tag.id === row.tag_id)?.nama || "")
        .join(" ")
        .toLowerCase();

      const matchedProspek = prospekList.find(prospek => {
        const safeProspek = prospek.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${safeProspek}\\b`, "i");
        return regex.test(jobText) || regex.test(tagNames);
      });

      if (!matchedProspek) return null;

      return {
        ...job,
        matchedProspek
      };
    })
    .filter(Boolean);

  if (!matchedJobs.length) return;

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

        copyBtn.textContent = "✅ Link Tersalin";

        setTimeout(() => {
          copyBtn.textContent = "🔗 Salin Link";
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
      .select("*");

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

      <p>
        ${escapeHTML(
          stripHTML(item.deskripsi || "")
        ).slice(0, 120)}...
      </p>

      <a
        href="jurusan-detail.html?id=${item.id}"
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

  document.title = title;

  setMetaTag("description", description);
  setMetaTag("og:title", title, "property");
  setMetaTag("og:description", description, "property");
  setMetaTag("og:type", "article", "property");
  setMetaTag("og:url", window.location.href, "property");
  setMetaTag("twitter:card", "summary_large_image");
  setMetaTag("twitter:title", title);
  setMetaTag("twitter:description", description);
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
        "item": `${window.location.origin}/index.html`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Jurusan",
        "item": `${window.location.origin}/jurusan.html`
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
  setupBiayaTabs();
}

initJurusanDetailPage();
