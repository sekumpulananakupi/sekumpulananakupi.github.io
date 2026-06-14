const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

      <h2>Statistik Penerimaan</h2>
      ${renderStatistik(statistik)}

      <h2>UKT</h2>
      ${renderLineList(jurusan.ukt, "Data UKT belum tersedia.")}

      <h2>Mata Kuliah</h2>
      ${renderLineList(jurusan.mata_kuliah, "Data mata kuliah belum tersedia.")}

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
    <div class="statistik-grid">
      ${statistik.map(item => {
        const persen = item.peminat > 0
          ? ((item.daya_tampung / item.peminat) * 100).toFixed(2)
          : "0.00";

        return `
          <div class="stat-card">
            <span>${escapeHTML(item.jalur)} ${item.tahun}</span>
            <strong>${persen}%</strong>
            <p>${item.daya_tampung} kursi dari ${item.peminat} peminat</p>
          </div>
        `;
      }).join("")}
    </div>
  `;
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
