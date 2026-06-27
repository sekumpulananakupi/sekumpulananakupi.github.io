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

function initSidebarNavigation() {

  const links =
    document.querySelectorAll(".sidebar-link[data-page]");

  links.forEach(link => {

    link.addEventListener("click", async () => {

      const page = link.dataset.page;

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

      document.querySelectorAll(".admin-dashboard-extra").forEach(section => {
        section.style.display = page === "dashboardPage" ? "block" : "none";
      });

      await loadAdminPage(page);

    });

  });

}

/* =========================
   LAZY LOAD PAGE
========================= */

async function loadDashboardAuditData() {
  if (dashboardAuditLoaded) return;

  await Promise.all([
    loadInfoData(),
    loadWikiData(),
    loadJobData(),
    loadDokumenData(),
    loadFaqData(),
    loadJurusanAdminData(),
    loadStatistikData(),
    loadBiayaPendidikanAdminData(),
    loadFaqJurusanData(),
    loadArtikelJurusanData(),
    loadMasterData()
  ]);

  dashboardAuditLoaded = true;
}

async function loadAdminPage(page) {

  if (loadedAdminPages.has(page)) {
    return;
  }

  switch (page) {

    case "infoPage":
      await loadMasterData();
      await loadInfoData();
      break;

    case "wikiPage":
      await loadMasterData();
      await loadWikiData();
      break;

    case "jobPage":
      await loadMasterData();
      await loadArtikelJurusanData();
      await loadJobData();
      break;

    case "dokumenPage":
      await loadDokumenData();
      break;

    case "faqPage":
      await loadFaqData();
      break;

    case "jurusanPage":
      await loadJurusanAdminData();
      break;

    case "statistikPage":
      await loadMasterData();
      await loadStatistikData();
      break;

    case "biayaPendidikanPage":
      await loadJurusanAdminData();
      populateBiayaJurusanOptions();
      await loadBiayaPendidikanAdminData();
      break;

    case "faqJurusanPage":
      await loadJurusanAdminData();
      populateFaqJurusanOptions();
      await loadFaqJurusanData();
      break;

    case "taxonomyPage":
      await loadTaxonomyAdminData();
      break;

 case "dashboardPage":
  await loadDashboardAuditData();
  initHealthFilters();
  renderWebsiteHealthDashboard();
  renderJurusanCompletenessDashboard();
  renderJobAnalytics();
  break;

  }

  loadedAdminPages.add(page);

}

/* =========================
   SEARCH
========================= */

let adminSearchTimer;

function debounceAdminRender(type) {
  clearTimeout(adminSearchTimer);

  adminSearchTimer = setTimeout(() => {
    if (type === "info") renderList("info", "infoList", "infoSearch");
    if (type === "wiki") renderList("wiki", "wikiList", "wikiSearch");
    if (type === "job") renderList("job", "jobList", "jobSearch");
  }, 300);
}

if (qs("infoSearch")) {
  qs("infoSearch").addEventListener("input", () => {
    debounceAdminRender("info");
  });
}

if (qs("wikiSearch")) {
  qs("wikiSearch").addEventListener("input", () => {
    debounceAdminRender("wiki");
  });
}

if (qs("jobSearch")) {
  qs("jobSearch").addEventListener("input", () => {
    debounceAdminRender("job");
  });
}

if (qs("jobStatusFilter")) {
  qs("jobStatusFilter").addEventListener("change", () => {
    renderList("job", "jobList", "jobSearch");
  });
}

if (qs("jobSalaryFilter")) {
  qs("jobSalaryFilter").addEventListener("change", () => {
    renderList("job", "jobList", "jobSearch");
  });
}

/* =========================
   START
========================= */

initQuillEditors();
initSidebarNavigation();
checkSession();
