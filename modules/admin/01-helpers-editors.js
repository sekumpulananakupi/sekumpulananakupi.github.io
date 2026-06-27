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
   ADMIN PAGINATION HELPERS
========================= */

function resetAdminListPagination(type) {
  if (!type || !adminListVisibleCount) return;
  adminListVisibleCount[type] = ADMIN_PAGE_SIZE;
}

function loadMoreAdminList(type, renderFn) {
  if (!type || !adminListVisibleCount[type]) return;
  adminListVisibleCount[type] += ADMIN_PAGE_SIZE;
  if (typeof renderFn === "function") renderFn();
}

function renderAdminLoadMore(type, filteredLength, renderFnName) {
  if (!type || !adminListVisibleCount[type]) return "";
  if (filteredLength <= adminListVisibleCount[type]) return "";

  return `
    <div class="admin-load-more">
      <button class="btn ghost" type="button" onclick="loadMoreAdminList('${type}', ${renderFnName})">
        Muat Lagi (${adminListVisibleCount[type]} / ${filteredLength})
      </button>
    </div>
  `;
}

async function loadMoreAdminJob() {
  if (!adminJobHasMore) return;
  await loadJobData({ append: true });
}

async function loadMoreAdminBiaya() {
  if (!adminBiayaHasMore) return;
  await loadBiayaPendidikanAdminData({ append: true });
}

function markAdminPageStale(pageId) {
  loadedAdminPages.delete(pageId);
}

function resetDashboardAudit() {
  dashboardAuditLoaded = false;
  loadedAdminPages.delete("dashboardPage");
}
