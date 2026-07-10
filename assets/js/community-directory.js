const COMMUNITY_SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const COMMUNITY_SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const communityClient = window.supabase
  ? window.supabase.createClient(COMMUNITY_SUPABASE_URL, COMMUNITY_SUPABASE_ANON_KEY)
  : null;

let communityListings = [];
let communityCategories = [];

function getCommunityElement(id) {
  return document.getElementById(id);
}

function escapeCommunityHTML(value) {
  const entities = {
    "&": String.fromCharCode(38) + "amp;",
    "<": String.fromCharCode(38) + "lt;",
    ">": String.fromCharCode(38) + "gt;",
    "\"": String.fromCharCode(38) + "quot;",
    "'": String.fromCharCode(38) + "#039;"
  };
  return String(value || "").replace(/[&<>"']/g, (character) => entities[character]);
}

function safeCommunityURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch (error) {
    return "";
  }
}

function setCommunityStatus(message, isError = false) {
  const status = getCommunityElement("communityDirectoryStatus");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function renderCategoryOptions() {
  const select = getCommunityElement("communityCategoryFilter");
  if (!select) return;

  select.innerHTML = [
    '<option value="">Semua kategori</option>',
    ...communityCategories.map((category) =>
      `<option value="${category.id}">${escapeCommunityHTML(category.name)}</option>`
    )
  ].join("");
}

function getFilteredCommunityListings() {
  const query = String(getCommunityElement("communitySearch")?.value || "").trim().toLowerCase();
  const categoryId = String(getCommunityElement("communityCategoryFilter")?.value || "");

  return communityListings.filter((listing) => {
    const searchable = [
      listing.name,
      listing.description,
      listing.faculty,
      ...(listing.majors || []),
      ...(listing.interests || [])
    ].join(" ").toLowerCase();

    return (!query || searchable.includes(query)) && (!categoryId || String(listing.category_id) === categoryId);
  });
}

function getCategoryName(categoryId) {
  return communityCategories.find((category) => String(category.id) === String(categoryId))?.name || "Komunitas";
}

function renderCommunityListings() {
  const target = getCommunityElement("communityDirectoryList");
  const count = getCommunityElement("communityListingCount");
  if (!target) return;

  const items = getFilteredCommunityListings();
  if (count) count.textContent = `${items.length} komunitas ditemukan`;

  if (!items.length) {
    target.innerHTML = `
      <div class="community-directory-empty">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <h3>Belum ada komunitas yang sesuai</h3>
        <p>Ubah kata kunci atau kategori. Kamu juga dapat mengusulkan komunitas yang relevan untuk ditinjau moderator.</p>
      </div>`;
    return;
  }

  target.innerHTML = items.map((listing) => {
    const contactURL = safeCommunityURL(listing.contact_url);
    const tags = [...(listing.majors || []), ...(listing.interests || [])].slice(0, 4);
    const verification = listing.verification_status === "official"
      ? "Kanal resmi"
      : listing.verification_status === "verified"
        ? "Terverifikasi"
        : "Belum diverifikasi";

    return `
      <article class="community-listing-card">
        <div class="community-listing-topline">
          <span class="community-category-chip">${escapeCommunityHTML(getCategoryName(listing.category_id))}</span>
          <span class="community-verification ${escapeCommunityHTML(listing.verification_status)}">${verification}</span>
        </div>
        <h3>${escapeCommunityHTML(listing.name)}</h3>
        <p>${escapeCommunityHTML(listing.description || "Belum ada deskripsi komunitas.")}</p>
        ${listing.faculty ? `<p class="community-listing-faculty"><i class="fa-solid fa-building-columns" aria-hidden="true"></i> ${escapeCommunityHTML(listing.faculty)}</p>` : ""}
        ${tags.length ? `<div class="community-tag-list">${tags.map((tag) => `<span>${escapeCommunityHTML(tag)}</span>`).join("")}</div>` : ""}
        <div class="community-listing-actions">
          ${contactURL ? `<a class="community-directory-link" href="${escapeCommunityHTML(contactURL)}" target="_blank" rel="noopener">Kunjungi kanal <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>` : "<span class=\"community-no-contact\">Kontak menyusul</span>"}
          <button class="community-report-button" type="button" data-report-listing="${listing.id}" data-listing-name="${escapeCommunityHTML(listing.name)}">Laporkan</button>
        </div>
      </article>`;
  }).join("");
}

async function loadCommunityDirectory() {
  if (!communityClient) {
    setCommunityStatus("Direktori belum dapat dimuat karena layanan akun tidak tersedia.", true);
    return;
  }

  setCommunityStatus("Memuat komunitas yang telah dipublikasikan…");
  const [categoryResult, listingResult] = await Promise.all([
    communityClient.from("community_categories").select("id,name,slug").order("name"),
    communityClient
      .from("community_listings")
      .select("id,name,description,category_id,faculty,majors,interests,contact_url,verification_status,created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
  ]);

  if (categoryResult.error || listingResult.error) {
    console.error("Gagal memuat direktori komunitas:", categoryResult.error || listingResult.error);
    setCommunityStatus("Direktori belum tersedia. Coba muat ulang setelah fondasi komunitas diaktifkan.", true);
    return;
  }

  communityCategories = categoryResult.data || [];
  communityListings = listingResult.data || [];
  renderCategoryOptions();
  renderCommunityListings();
  setCommunityStatus("Hanya komunitas yang sudah melalui moderasi yang ditampilkan.");
}

async function renderCommunitySubmissionState() {
  const gate = getCommunityElement("communitySubmissionGate");
  const form = getCommunityElement("communitySubmissionForm");
  if (!gate || !form) return;

  const user = typeof getCurrentSaupiUser === "function" ? await getCurrentSaupiUser() : null;
  gate.hidden = Boolean(user);
  form.hidden = !user;

  if (!user) return;
  const categorySelect = getCommunityElement("communitySubmissionCategory");
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Pilih kategori</option>' + communityCategories
      .map((category) => `<option value="${category.id}">${escapeCommunityHTML(category.name)}</option>`)
      .join("");
  }
}

async function submitCommunityListing(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  const status = getCommunityElement("communitySubmissionStatus");
  const user = typeof getCurrentSaupiUser === "function" ? await getCurrentSaupiUser() : null;

  if (!user) {
    if (status) status.textContent = "Masuk ke akun terlebih dahulu untuk mengusulkan komunitas.";
    return;
  }

  const contactURL = safeCommunityURL(form.contact_url.value);
  if (!contactURL) {
    if (status) status.textContent = "Masukkan tautan kanal yang valid (http:// atau https://).";
    return;
  }

  const payload = {
    name: form.name.value.trim(),
    description: form.description.value.trim(),
    category_id: Number(form.category_id.value) || null,
    faculty: form.faculty.value.trim() || null,
    majors: form.majors.value.split(",").map((item) => item.trim()).filter(Boolean),
    interests: form.interests.value.split(",").map((item) => item.trim()).filter(Boolean),
    contact_url: contactURL,
    created_by: user.id,
    status: "pending"
  };

  submitButton.disabled = true;
  if (status) status.textContent = "Mengirim usulan untuk ditinjau moderator…";
  const { error } = await communityClient.from("community_listings").insert(payload);
  submitButton.disabled = false;

  if (error) {
    console.error("Gagal mengirim usulan komunitas:", error);
    if (status) status.textContent = "Usulan belum terkirim. Pastikan fondasi komunitas sudah diaktifkan, lalu coba lagi.";
    return;
  }

  form.reset();
  if (status) status.textContent = "Usulan terkirim dengan status menunggu moderasi. Kamu akan melihatnya setelah dipublikasikan.";
}

async function reportCommunityListing(button) {
  const user = typeof getCurrentSaupiUser === "function" ? await getCurrentSaupiUser() : null;
  if (!user) {
    window.location.href = "akun.html";
    return;
  }

  const reason = window.prompt(`Mengapa “${button.dataset.listingName}” perlu ditinjau?`);
  if (!reason?.trim()) return;

  button.disabled = true;
  const { error } = await communityClient.from("community_reports").insert({
    listing_id: Number(button.dataset.reportListing),
    reporter_id: user.id,
    reason: reason.trim()
  });
  button.disabled = false;

  if (error) {
    console.error("Gagal mengirim laporan komunitas:", error);
    setCommunityStatus("Laporan belum terkirim. Coba lagi setelah beberapa saat.", true);
    return;
  }

  setCommunityStatus("Laporan diterima dan akan ditinjau moderator.");
}

function selectCommunityCategoryBySlug(slug) {
  const select = getCommunityElement("communityCategoryFilter");
  const category = communityCategories.find((item) => item.slug === slug);
  if (!select || !category) return;
  select.value = String(category.id);
  renderCommunityListings();
}

function initialiseCommunityDirectory() {
  getCommunityElement("communitySearch")?.addEventListener("input", renderCommunityListings);
  getCommunityElement("communityCategoryFilter")?.addEventListener("change", renderCommunityListings);
  getCommunityElement("communitySubmissionForm")?.addEventListener("submit", submitCommunityListing);
  getCommunityElement("communityDirectoryList")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-report-listing]");
    if (button) reportCommunityListing(button);
  });

  document.querySelectorAll("[data-category-slug]").forEach((link) => {
    link.addEventListener("click", () => {
      window.setTimeout(() => selectCommunityCategoryBySlug(link.dataset.categorySlug), 0);
    });
  });

  loadCommunityDirectory().then(async () => {
    await renderCommunitySubmissionState();
    const requestedCategory = new URLSearchParams(window.location.search).get("kategori");
    if (requestedCategory) selectCommunityCategoryBySlug(requestedCategory);
  }).catch((error) => {
    console.error("Inisialisasi direktori komunitas gagal:", error);
    setCommunityStatus("Direktori belum dapat disiapkan. Coba muat ulang halaman ini.", true);
  });
}

document.addEventListener("DOMContentLoaded", initialiseCommunityDirectory);
