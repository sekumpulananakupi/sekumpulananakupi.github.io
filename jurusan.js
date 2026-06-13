const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let jurusanData = [];

async function loadJurusan() {

  const { data } = await supabaseClient
    .from("jurusan")
    .select("*")
    .order("nama");

  jurusanData = data || [];

  renderJurusan();
}

function renderJurusan() {

  const keyword =
    document
      .getElementById("jurusanSearch")
      .value
      .toLowerCase();

  const filtered = jurusanData.filter(item =>
    item.nama.toLowerCase().includes(keyword)
  );

  document.getElementById("jurusanList").innerHTML =
    filtered.length
      ? filtered.map(createCard).join("")
      : `<div class="empty">Tidak ada jurusan.</div>`;
}

function createCard(item) {

  return `
    <article class="item-card">

      <h3>${item.nama}</h3>

      <p>
        ${item.fakultas || "-"}
      </p>

      <a
        href="jurusan-detail.html?id=${item.id}"
        class="btn primary"
      >
        Lihat Detail
      </a>

    </article>
  `;
}

document
  .getElementById("jurusanSearch")
  .addEventListener("input", renderJurusan);

loadJurusan();
