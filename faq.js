const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let faqData = [];

async function loadFaq() {

  const { data } = await supabaseClient
    .from("faq_kampus")
    .select("*")
    .order("created_at", { ascending: false });

  faqData = data || [];

  renderFaq();

}

function renderFaq() {

  const keyword =
    document
      .getElementById("faqSearch")
      .value
      .toLowerCase();

  const filtered =
    faqData.filter(item =>
      JSON.stringify(item)
        .toLowerCase()
        .includes(keyword)
    );

  document.getElementById("faqContainer").innerHTML =
    filtered.length
      ? filtered.map(createFaqCard).join("")
      : `
        <div class="empty">
          FAQ tidak ditemukan.
        </div>
      `;

}

function createFaqCard(item) {

  return `
    <details class="faq-item">

      <summary>

        <span class="pill">
          ${escapeHTML(item.kategori || "FAQ")}
        </span>

        ${escapeHTML(item.pertanyaan)}

      </summary>

      <div class="faq-answer">

        ${escapeHTML(item.jawaban)
          .replace(/\n/g, "<br>")}

      </div>

    </details>
  `;

}

document
  .getElementById("faqSearch")
  .addEventListener("input", renderFaq);

loadFaq();
