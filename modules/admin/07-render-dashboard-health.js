/* =========================
   RENDER CONTENT LIST
========================= */

function createCard(type, item) {
  if (type === "info") {
    return `
      <article class="admin-list-item">
        <div>
          <span class="pill">Info Kampus</span>
          ${item.kategori ? `<span class="pill">${item.kategori}</span>` : ""}
          <h3>${item.judul || "-"}</h3>
          <p>${stripHTML(item.isi || "").slice(0, 100)}...</p>
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
          ${item.kategori ? `<span class="pill">${item.kategori}</span>` : ""}
          <h3>${item.judul || "-"}</h3>
          <p>${stripHTML(item.isi || "").slice(0, 100)}...</p>
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
        <span class="pill">${getEffectiveJobStatus(item)}</span>
        ${item.tipe_pekerjaan ? `<span class="pill">${item.tipe_pekerjaan}</span>` : ""}
        ${item.jenjang_pendidikan ? `<span class="pill">${item.jenjang_pendidikan}</span>` : ""}
        ${item.is_featured ? `<span class="pill">⭐ Pilihan</span>` : ""}
        ${item.sumber ? `<span class="pill">${item.sumber}</span>` : ""}

        <h3>${item.posisi || "-"}</h3>
        <p>${stripHTML(item.deskripsi || "").slice(0, 100)}...</p>
        ${formatGaji(item) ? `<p><strong>Gaji:</strong> ${formatGaji(item)}</p>` : ""}
        ${item.deadline ? `<small>${getDeadlineStatus(item.deadline)}</small>` : ""}
      </div>

      <div class="card-actions">
        <button class="btn ghost" onclick="editJob(${item.id})">Edit</button>
        <button class="btn danger" onclick="deleteItem('job', ${item.id})">Hapus</button>
      </div>
    </article>
  `;
}

function renderList(type, listId, searchId) {
  const keyword = qs(searchId)?.value.toLowerCase().trim() || "";

  let data = [];
  if (type === "info") data = infoData;
  if (type === "wiki") data = wikiData;
  if (type === "job") data = jobData;

  let filtered = data.filter(item => {
    const searchText = (
      (item.judul || "") + " " +
      (item.posisi || "") + " " +
      (item.perusahaan || "") + " " +
      (item.kategori || "") + " " +
      stripHTML(item.isi || "") + " " +
      stripHTML(item.deskripsi || "")
    ).toLowerCase();

    return !keyword || searchText.includes(keyword);
  });

  if (type === "job") {
    const statusFilter = qs("jobStatusFilter")?.value || "all";
    const salaryFilter = qs("jobSalaryFilter")?.value || "all";

    if (statusFilter === "featured") {
      filtered = filtered.filter(item => item.is_featured);
    } else if (statusFilter !== "all") {
      filtered = filtered.filter(item => getEffectiveJobStatus(item) === statusFilter);
    }

    if (salaryFilter === "with_salary") {
      filtered = filtered.filter(item => item.gaji_min || item.gaji_max || item.gaji_keterangan);
    }

    if (salaryFilter === "without_salary") {
      filtered = filtered.filter(item => !item.gaji_min && !item.gaji_max && !item.gaji_keterangan);
    }
  }

  const list = qs(listId);
  if (!list) return;

  const visibleItems = filtered.slice(0, adminListVisibleCount[type] || ADMIN_PAGE_SIZE);

  const loadMoreButton =
    type === "job" && adminJobHasMore
      ? `
        <div class="admin-load-more">
          <button class="btn ghost" type="button" onclick="loadMoreAdminJob()">
            Muat Lagi Lowongan
          </button>
        </div>
      `
      : renderAdminLoadMore(type, filtered.length, "renderAll");

  list.innerHTML = visibleItems.length
    ? `${visibleItems.map(item => createCard(type, item)).join("")}${loadMoreButton}`
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
  if (qs("adminAutoClosedJobs")) {
  qs("adminAutoClosedJobs").textContent = autoClosedJobsCount || 0;
}
}

function renderJobAnalytics() {
  const companyContainer = qs("jobTopCompanies");
  const sourceContainer = qs("jobTopSources");
  const typeContainer = qs("jobTopTypes");
  const jurusanContainer = qs("jobTopJurusan");
  const statusContainer = qs("jobStatusDistribution");
  const monthlyTrendContainer = qs("jobMonthlyTrend");

  if (!companyContainer) return;

  const companyCounts = {};
  const sourceCounts = {};
  const typeCounts = {};
  const statusCounts = {};
  const jurusanCounts = {};
  const monthlyCounts = {};

  const jurusanMap = new Map(
    jurusanData.map(j => [Number(j.id), j.nama])
  );

  const artikelMap = new Map();

  artikelJurusanData.forEach(row => {
    const artikelId = Number(row.artikel_id);
    const jurusanId = Number(row.jurusan_id);

    if (!artikelMap.has(artikelId)) {
      artikelMap.set(artikelId, []);
    }

    artikelMap.get(artikelId).push(jurusanId);
  });

  jobData.forEach(job => {
    if (job.perusahaan) companyCounts[job.perusahaan] = (companyCounts[job.perusahaan] || 0) + 1;
    if (job.sumber) sourceCounts[job.sumber] = (sourceCounts[job.sumber] || 0) + 1;
    if (job.tipe_pekerjaan) typeCounts[job.tipe_pekerjaan] = (typeCounts[job.tipe_pekerjaan] || 0) + 1;

    const status = getEffectiveJobStatus(job);
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const monthLabel = getMonthLabel(job.created_at);
    monthlyCounts[monthLabel] = (monthlyCounts[monthLabel] || 0) + 1;

    const jurusanIds = artikelMap.get(Number(job.id)) || [];
    jurusanIds.forEach(id => {
      const nama = jurusanMap.get(Number(id));
      if (!nama) return;
      jurusanCounts[nama] = (jurusanCounts[nama] || 0) + 1;
    });
  });

  renderTopList(companyContainer, companyCounts);
  renderTopList(sourceContainer, sourceCounts);
  renderTopList(typeContainer, typeCounts);
  renderTopList(jurusanContainer, jurusanCounts);
  renderTopList(statusContainer, statusCounts);
  renderTopList(monthlyTrendContainer, monthlyCounts, 12);
}

function renderTopList(container, data, limit = 5) {
  if (!container) return;

  const items = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  container.innerHTML = items.length
    ? items.map(([name, count], index) => `
      <p>
        ${index + 1}. ${name}
        <strong>${count}</strong>
      </p>
    `).join("")
    : "<p>Belum ada data.</p>";
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

  if (qs("infoList")) renderList("info", "infoList", "infoSearch");
  if (qs("wikiList")) renderList("wiki", "wikiList", "wikiSearch");
  if (qs("jobList")) renderList("job", "jobList", "jobSearch");
}
