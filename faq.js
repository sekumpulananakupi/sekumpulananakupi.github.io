const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let faqData = [];
let activeFaqKategori = "all";

function escapeHTML(text) {
  return String(text || "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));
}

async function loadFaq() {
  const { data, error } = await supabaseClient
    .from("faq_kampus")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal mengambil FAQ:", error);
    return;
  }

  faqData = data || [];

  renderFaqKategoriFilter();
  renderFaq();
}

function renderFaqKategoriFilter() {
  const select = document.getElementById("faqKategoriFilter");
  if (!select) return;

  const kategoriList = [...new Set(
    faqData
      .map(item => item.kategori)
      .filter(Boolean)
  )];

  select.innerHTML =
    `<option value="all">Semua Kategori</option>` +
    kategoriList
      .map(item => `<option value="${escapeHTML(item)}">${escapeHTML(item)}</option>`)
      .join("");

  select.addEventListener("change", () => {
    activeFaqKategori = select.value;
    renderFaq();
  });
}

function renderFaq() {
  const searchInput = document.getElementById("faqSearch");
  const container = document.getElementById("faqContainer");

  if (!container) return;

  const keyword = searchInput
    ? searchInput.value.toLowerCase()
    : "";

  const filtered = faqData.filter(item => {
    const matchSearch = JSON.stringify(item)
      .toLowerCase()
      .includes(keyword);

    const matchKategori =
      activeFaqKategori === "all" ||
      item.kategori === activeFaqKategori;

    return matchSearch && matchKategori;
  });

  container.innerHTML = filtered.length
    ? filtered.map(createFaqCard).join("")
    : `<div class="empty">FAQ tidak ditemukan.</div>`;
}

function createFaqCard(item) {
  return `
    <details class="faq-item">
      <summary>
        <span class="pill">${escapeHTML(item.kategori || "FAQ")}</span>
        ${escapeHTML(item.pertanyaan)}
      </summary>

      <div class="faq-answer">
        ${escapeHTML(item.jawaban).replace(/\n/g, "<br>")}
      </div>
    </details>
  `;
}

const faqSearch = document.getElementById("faqSearch");

if (faqSearch) {
  faqSearch.addEventListener("input", renderFaq);
}

loadFaq();
