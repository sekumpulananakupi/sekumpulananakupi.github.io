const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let admissionChart = null;

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
      ${message}
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

async function loadJurusanDetail() {
  
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const detail = document.getElementById("jurusanDetail");
    showSimpleLoading("jurusanDetail", "Memuat detail jurusan...");
    showLoading("relatedArticleList", 3);
    showLoading("relatedJobList", 3);
  const relatedArticleList = document.getElementById("relatedArticleList");
  const relatedJobList = document.getElementById("relatedJobList");

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

  detail.innerHTML = `
    <article class="post-card">
      <span class="pill">${escapeHTML(jurusan.fakultas || "UPI")}</span>
      <h1>${escapeHTML(jurusan.nama)}</h1>
      <p class="post-date">${escapeHTML(jurusan.jenjang || "S1")}</p>

      <h2>Profil Jurusan</h2>
      <div class="post-content">
        ${escapeHTML(jurusan.deskripsi || "Deskripsi jurusan belum tersedia.").replace(/\n/g, "<br>")}
      </div>

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

      ${jurusan.website_resmi
        ? `<a href="${escapeHTML(jurusan.website_resmi)}" target="_blank" class="btn ghost">Website Resmi</a>`
        : ""}

        <div class="program-links">
        ${jurusan.url_kurikulum ? `
          <a href="${jurusan.url_kurikulum}" target="_blank" class="btn-link">
            📚 Lihat Kurikulum
          </a>
        ` : ''}
      
        ${jurusan.url_akreditasi ? `
          <a href="${jurusan.url_akreditasi}" target="_blank" class="btn-link">
            📄 Lihat Akreditasi
          </a>
        ` : ''}
      </div>


      <h2>Statistik Penerimaan</h2>
      ${renderStatistik(statistik)}

      ${renderBiayaPendidikanSection(Array.isArray(biayaPendidikan) ? biayaPendidikan : [])}

      <h2>FAQ Jurusan</h2>
      ${renderFaqJurusan(faqJurusan || [])}
      
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
}

async function loadStatistikJurusan(jurusanId) {
  const { data } = await supabaseClient
    .from("statistik_jurusan")
    .select("*")
    .eq("jurusan_id", jurusanId)
    .order("tahun", { ascending: false });

  return data || [];
}

function renderStatistik(statistik) {
  if (!statistik.length) {
    return `<div class="empty">Statistik jurusan belum tersedia.</div>`;
  }

  return `
    <section class="admission-section">
      <div class="admission-tabs">
        <button class="admission-tab active" data-jalur="SNBP">SNBP</button>
        <button class="admission-tab" data-jalur="SNBT">SNBT</button>
      </div>

      <div class="admission-summary" id="admissionSummary"></div>

      <div class="admission-controls">
        <button class="chart-mode-btn active" data-mode="jumlah">Daya Tampung & Peminat</button>
        <button class="chart-mode-btn" data-mode="keketatan">Keketatan (%)</button>
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
              <th>Keketatan</th>
            </tr>
          </thead>
          <tbody id="admissionTableBody"></tbody>
        </table>
      </div>
    </section>
  `;
}

function persenKeterimaan(item) {
  const dayaTampung = Number(item.daya_tampung);
  const peminat = Number(item.peminat);

  if (!peminat || peminat === 0) {
    return "0.00";
  }

  return ((dayaTampung / peminat) * 100).toFixed(2);
}

function setupAdmissionStatistik(statistik) {
  const tabs = document.querySelectorAll(".admission-tab");
  const modeButtons = document.querySelectorAll(".chart-mode-btn");
  const tbody = document.getElementById("admissionTableBody");
  const canvas = document.getElementById("admissionChart");
  const summary = document.getElementById("admissionSummary");

  if (!tabs.length || !tbody || !canvas) return;

  let activeJalur = "SNBP";
  let activeMode = "jumlah";

  function renderAdmission() {
    const data = statistik
      .filter(item => String(item.jalur).toUpperCase() === activeJalur)
      .sort((a, b) => Number(a.tahun) - Number(b.tahun));

    if (admissionChart) {
      admissionChart.destroy();
      admissionChart = null;
    }

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-statistik">
            Data ${activeJalur} belum tersedia.
          </td>
        </tr>
      `;

      if (summary) {
        summary.innerHTML = `<div class="empty">Ringkasan belum tersedia.</div>`;
      }

      return;
    }

    const latest = data[data.length - 1];

    if (summary) {
      summary.innerHTML = `
        <div class="admission-summary-card">
          <span>Tahun terbaru</span>
          <strong>${latest.tahun}</strong>
        </div>

        <div class="admission-summary-card">
          <span>Daya Tampung</span>
          <strong>${latest.daya_tampung}</strong>
        </div>

        <div class="admission-summary-card">
          <span>Peminat</span>
          <strong>${latest.peminat}</strong>
        </div>

        <div class="admission-summary-card">
          <span>Keketatan</span>
          <strong>${persenKeterimaan(latest)}%</strong>
        </div>
      `;
    }

    const labels = data.map(item => item.tahun);
    const dayaTampung = data.map(item => Number(item.daya_tampung));
    const peminat = data.map(item => Number(item.peminat));
    const keketatan = data.map(item => Number(persenKeterimaan(item)));

    const datasets = activeMode === "jumlah"
      ? [
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
        ]
      : [
          {
            type: "line",
            label: "Keketatan (%)",
            data: keketatan,
            yAxisID: "y",
            tension: 0.35
          }
        ];

    admissionChart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets
      },
      options: {
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
                const value = context.raw;

                if (label.includes("Keketatan")) {
                  return `${label}: ${value}%`;
                }

                return `${label}: ${Number(value).toLocaleString("id-ID")}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => activeMode === "keketatan"
                ? `${value}%`
                : Number(value).toLocaleString("id-ID")
            }
          }
        }
      }
    });

    tbody.innerHTML = data
      .slice()
      .sort((a, b) => Number(b.tahun) - Number(a.tahun))
      .map(item => `
        <tr>
          <td>${item.tahun}</td>
          <td>${Number(item.daya_tampung).toLocaleString("id-ID")} kursi</td>
          <td>${Number(item.peminat).toLocaleString("id-ID")} peminat</td>
          <td><strong>${persenKeterimaan(item)}%</strong></td>
        </tr>
      `)
      .join("");
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", function () {
      tabs.forEach(item => item.classList.remove("active"));
      this.classList.add("active");

      activeJalur = this.dataset.jalur;
      renderAdmission();
    });
  });

  modeButtons.forEach(button => {
    button.addEventListener("click", function () {
      modeButtons.forEach(item => item.classList.remove("active"));
      this.classList.add("active");

      activeMode = this.dataset.mode;
      renderAdmission();
    });
  });

  renderAdmission();
}

async function loadRelatedContent(jurusanId, relatedArticleList, relatedJobList) {
  if (!relatedArticleList || !relatedJobList) return;

  const { data: relasi } = await supabaseClient
    .from("artikel_jurusan")
    .select("*")
    .eq("jurusan_id", jurusanId);

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

    const { data } = await supabaseClient
      .from(table)
      .select("*")
      .eq("id", row.artikel_id)
      .single();

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

  if (item.type === "info" || item.type === "wiki") {
    title = item.judul;
    content = item.isi;
    label = item.type === "info" ? "Info Kampus" : "Wiki Kampus";
  }

  if (item.type === "job") {
    title = item.posisi;
    content = item.deskripsi;
    label = item.perusahaan || "Lowongan";
  }

  return `
    <article class="item-card" ${item.type === "job" ? `data-job-id="${item.id}"` : ""}>
      ${item.gambar ? `<img src="${escapeHTML(item.gambar)}" class="card-image" alt="${escapeHTML(title)}">` : ""}
      <span class="pill">${escapeHTML(label)}</span>
      ${item.matchLabel ? `<span class="pill tag-pill">${escapeHTML(item.matchLabel)}</span>` : ""}
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(stripHTML(content)).slice(0, 120)}...</p>
      <a href="post.html?type=${item.type}&id=${item.id}" class="btn ghost">Baca Detail</a>
    </article>
  `;
}

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

  const { data: jobs } = await supabaseClient
    .from("lowongan_kerja")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: tagRows } = await supabaseClient
    .from("artikel_tags")
    .select("artikel_id, tag_id")
    .eq("artikel_tipe", "job");

  const { data: tags } = await supabaseClient
    .from("tags")
    .select("*");

  const matchedJobs = (jobs || [])
    .map(job => {
      const jobText = `
        ${job.posisi || ""}
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

  const uniqueMatchedJobs = matchedJobs.filter(job => !existingJobIds.has(job.id));
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

  return `
    <section class="biaya-section">
      <h2>Biaya Pendidikan</h2>

      <div class="biaya-tabs">
        ${jalurTersedia.map((jalur, index) => `
          <button
            type="button"
            class="biaya-tab-btn ${index === 0 ? "active" : ""}"
            onclick="showBiayaTab('${jalur.key}', this)"
          >
            ${jalur.label}
          </button>
        `).join("")}
      </div>

      ${jalurTersedia.map((jalur, index) => `
        <div
          class="biaya-tab-content ${index === 0 ? "active" : ""}"
          id="biaya-${jalur.key}"
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
    return `<div class="empty">Data belum tersedia</div>`;
  }

  return `
    <div class="biaya-card-grid">
      ${items.map(item => `
        <div class="biaya-card">

          ${
            item.kelompok
              ? `<div class="biaya-title">Kelompok ${item.kelompok}</div>`
              : item.status_mahasiswa
                ? `<div class="biaya-title">${item.status_mahasiswa}</div>`
                : `<div class="biaya-title">${jalur}</div>`
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

function showBiayaTab(jalur, button) {
  document.querySelectorAll(".biaya-tab-content").forEach(content => {
    content.classList.remove("active");
  });

  document.querySelectorAll(".biaya-tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  const target = document.getElementById(`biaya-${jalur}`);
  if (target) target.classList.add("active");

  if (button) button.classList.add("active");
}


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
        await navigator.clipboard.writeText(
          window.location.href
        );

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

loadJurusanDetail();
