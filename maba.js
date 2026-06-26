const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = window.supabase
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const checklistKey = "saupi_maba_checklist_v1";

const checklistInputs = document.querySelectorAll("#mabaChecklist input[type='checkbox']");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const faqSearch = document.getElementById("faqSearch");

function loadChecklist() {
  const saved = JSON.parse(localStorage.getItem(checklistKey) || "{}");

  checklistInputs.forEach(input => {
    input.checked = Boolean(saved[input.dataset.id]);
  });

  updateProgress();
}

function saveChecklist() {
  const data = {};

  checklistInputs.forEach(input => {
    data[input.dataset.id] = input.checked;
  });

  localStorage.setItem(checklistKey, JSON.stringify(data));
  updateProgress();
}

function updateProgress() {
  const total = checklistInputs.length;
  const checked = [...checklistInputs].filter(input => input.checked).length;
  const percent = total ? Math.round((checked / total) * 100) : 0;

  if (progressText) progressText.textContent = percent + "%";
  if (progressFill) progressFill.style.width = percent + "%";
}

function initChecklist() {
  checklistInputs.forEach(input => {
    input.addEventListener("change", saveChecklist);
  });

  loadChecklist();
}

function initQuickScroll() {
  document.querySelectorAll(".quick-card").forEach(card => {
    card.addEventListener("click", () => {
      const target = document.querySelector(card.dataset.target);

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
}

function initAccordion() {
  document.addEventListener("click", event => {
    const button = event.target.closest(".accordion-btn");

    if (!button) return;

    const item = button.closest(".accordion-item");

    if (item) {
      item.classList.toggle("active");
    }
  });
}

function initFaqSearch() {
  if (!faqSearch) return;

  faqSearch.addEventListener("input", () => {
    const keyword = faqSearch.value.toLowerCase().trim();

    document.querySelectorAll(".faq-item").forEach(item => {
      const text = item.textContent.toLowerCase() + " " + (item.dataset.keyword || "");
      item.style.display = text.includes(keyword) ? "" : "none";
    });
  });
}

function createCard(title, desc, href = "#") {
  return `
    <a href="${href}" class="maba-card maba-card-link">
      <h3>${title || "Tanpa Judul"}</h3>
      <p>${desc || "Belum ada deskripsi."}</p>
    </a>
  `;
}

function createFaqItem(question, answer, keyword = "") {
  return `
    <div class="accordion-item faq-item" data-keyword="${keyword}">
      <button class="accordion-btn">${question || "Pertanyaan"} <span>+</span></button>
      <div class="accordion-content">
        ${answer || "Jawaban belum tersedia."}
      </div>
    </div>
  `;
}

async function loadMabaWiki() {
  const container = document.getElementById("mabaWikiList");
  if (!container || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("wiki_kampus")
    .select("judul, ringkasan, slug, kategori")
    .or("kategori.ilike.%maba%,kategori.ilike.%mahasiswa baru%,judul.ilike.%maba%,judul.ilike.%mahasiswa baru%")
    .limit(4);

  if (error || !data || data.length === 0) return;

  container.innerHTML = data.map(item => {
    const href = item.slug ? `wiki-detail.html?slug=${item.slug}` : "wiki.html";
    return createCard(item.judul, item.ringkasan, href);
  }).join("");
}

async function loadMabaDokumen() {
  const container = document.getElementById("mabaDokumenList");
  if (!container || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("dokumen")
    .select("judul, deskripsi, file_url, kategori")
    .or("kategori.ilike.%maba%,kategori.ilike.%mahasiswa baru%,judul.ilike.%pedoman%,judul.ilike.%kalender%,judul.ilike.%pkkmb%")
    .limit(4);

  if (error || !data || data.length === 0) return;

  container.innerHTML = data.map(item => {
    const href = item.file_url || "dokumen.html";
    return createCard(item.judul, item.deskripsi, href);
  }).join("");
}

async function loadMabaFaq() {
  const container = document.getElementById("faqList");
  if (!container || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("faq")
    .select("pertanyaan, jawaban, kategori")
    .or("kategori.ilike.%maba%,kategori.ilike.%mahasiswa baru%,pertanyaan.ilike.%ukt%,pertanyaan.ilike.%pkkmb%,pertanyaan.ilike.%krs%")
    .limit(8);

  if (error || !data || data.length === 0) return;

  container.innerHTML = data.map(item => {
    return createFaqItem(item.pertanyaan, item.jawaban, item.kategori || "");
  }).join("");
}

async function loadMabaKomunitas() {
  const container = document.getElementById("mabaKomunitasList");
  if (!container || !supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("komunitas")
    .select("nama, deskripsi, link, kategori")
    .or("kategori.ilike.%maba%,kategori.ilike.%jurusan%,kategori.ilike.%ukm%,nama.ilike.%angkatan%")
    .limit(4);

  if (error || !data || data.length === 0) return;

  container.innerHTML = data.map(item => {
    return createCard(item.nama, item.deskripsi, item.link || "komunitas.html");
  }).join("");
}

async function loadDynamicMabaContent() {
  await Promise.allSettled([
    loadMabaWiki(),
    loadMabaDokumen(),
    loadMabaFaq(),
    loadMabaKomunitas()
  ]);
}

initChecklist();
initQuickScroll();
initAccordion();
initFaqSearch();
loadDynamicMabaContent();