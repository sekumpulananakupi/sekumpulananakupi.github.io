const moderationClient = window.supabase
  ? window.supabase.createClient(
      "https://rozfgvucyiwqqmmrmbph.supabase.co",
      "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq"
    )
  : null;

function moderationElement(id) {
  return document.getElementById(id);
}

function setModerationStatus(message, isError = false) {
  const status = moderationElement("moderationStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function escapeModerationHTML(value) {
  const entities = {
    "&": String.fromCharCode(38) + "amp;",
    "<": String.fromCharCode(38) + "lt;",
    ">": String.fromCharCode(38) + "gt;",
    "\"": String.fromCharCode(38) + "quot;",
    "'": String.fromCharCode(38) + "#039;"
  };
  return String(value || "").replace(/[&<>"']/g, (character) => entities[character]);
}

function renderModerationEmpty(target, title, description) {
  target.innerHTML = `<div class="community-directory-empty"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><h3>${title}</h3><p>${description}</p></div>`;
}

async function getStaffUser() {
  const user = typeof getCurrentSaupiUser === "function" ? await getCurrentSaupiUser() : null;
  if (!user || !moderationClient) return null;
  const { data, error } = await moderationClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !["moderator", "admin"].includes(data?.role)) return null;
  return user;
}

async function loadModerationData() {
  const listingsTarget = moderationElement("moderationListings");
  const reportsTarget = moderationElement("moderationReports");
  const [listingsResult, reportsResult] = await Promise.all([
    moderationClient
      .from("community_listings")
      .select("id,name,description,faculty,contact_url,status,created_at")
      .in("status", ["pending", "in_review", "needs_changes"])
      .order("created_at", { ascending: true }),
    moderationClient
      .from("community_reports")
      .select("id,listing_id,reason,details,status,created_at")
      .eq("status", "open")
      .order("created_at", { ascending: true })
  ]);

  if (listingsResult.error || reportsResult.error) {
    console.error("Gagal memuat moderasi:", listingsResult.error || reportsResult.error);
    setModerationStatus("Antrean moderasi belum dapat dimuat.", true);
    return;
  }

  const listings = listingsResult.data || [];
  if (!listings.length) {
    renderModerationEmpty(listingsTarget, "Antrean usulan kosong", "Tidak ada komunitas yang menunggu keputusan.");
  } else {
    listingsTarget.innerHTML = listings.map((listing) => `
      <article class="community-listing-card">
        <span class="community-verification">${escapeModerationHTML(listing.status)}</span>
        <h3>${escapeModerationHTML(listing.name)}</h3>
        <p>${escapeModerationHTML(listing.description || "Tanpa deskripsi.")}</p>
        ${listing.faculty ? `<p class="community-listing-faculty">${escapeModerationHTML(listing.faculty)}</p>` : ""}
        <div class="community-listing-actions">
          <button class="community-directory-link" type="button" data-listing-action="published" data-listing-id="${listing.id}">Publikasikan</button>
          <button class="community-report-button" type="button" data-listing-action="needs_changes" data-listing-id="${listing.id}">Minta perbaikan</button>
        </div>
      </article>`).join("");
  }

  const reports = reportsResult.data || [];
  if (!reports.length) {
    renderModerationEmpty(reportsTarget, "Tidak ada laporan terbuka", "Laporan baru dari anggota akan muncul di sini.");
  } else {
    reportsTarget.innerHTML = reports.map((report) => `
      <article class="community-listing-card">
        <span class="community-category-chip">Laporan #${report.id}</span>
        <h3>${escapeModerationHTML(report.reason)}</h3>
        <p>${escapeModerationHTML(report.details || "Pelapor tidak menambahkan rincian.")}</p>
        <div class="community-listing-actions">
          <span class="community-no-contact">Entri #${report.listing_id}</span>
          <button class="community-directory-link" type="button" data-report-id="${report.id}" data-report-status="resolved">Tandai selesai</button>
          <button class="community-report-button" type="button" data-report-id="${report.id}" data-report-status="dismissed">Tutup laporan</button>
        </div>
      </article>`).join("");
  }

  setModerationStatus("Antrean moderasi diperbarui.");
}

async function handleModerationAction(button) {
  const listingId = button.dataset.listingId;
  const reportId = button.dataset.reportId;
  button.disabled = true;

  let error;
  if (listingId) {
    const result = await moderationClient.from("community_listings").update({
      status: button.dataset.listingAction,
      reviewed_at: new Date().toISOString()
    }).eq("id", Number(listingId));
    error = result.error;
  } else if (reportId) {
    const result = await moderationClient.from("community_reports").update({
      status: button.dataset.reportStatus,
      resolved_at: new Date().toISOString()
    }).eq("id", Number(reportId));
    error = result.error;
  }

  if (error) {
    console.error("Aksi moderasi gagal:", error);
    setModerationStatus("Perubahan tidak tersimpan. Coba lagi.", true);
    button.disabled = false;
    return;
  }

  await loadModerationData();
}

async function initialiseCommunityModeration() {
  const accessDenied = moderationElement("moderationAccessDenied");
  const workspace = moderationElement("moderationWorkspace");
  const user = await getStaffUser();
  if (!user) {
    accessDenied.hidden = false;
    setModerationStatus("Akses moderator atau admin diperlukan.", true);
    return;
  }

  workspace.hidden = false;
  workspace.addEventListener("click", (event) => {
    const button = event.target.closest("[data-listing-action], [data-report-status]");
    if (button) handleModerationAction(button);
  });
  await loadModerationData();
}

document.addEventListener("DOMContentLoaded", () => {
  initialiseCommunityModeration().catch((error) => {
    console.error("Inisialisasi moderasi gagal:", error);
    setModerationStatus("Moderasi belum dapat disiapkan.", true);
  });
});
