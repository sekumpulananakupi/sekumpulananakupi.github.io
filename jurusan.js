const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let jurusanData = [];

async function loadJurusan() {
  const list = document.getElementById("jurusanList");
  const info = document.getElementById("jurusanResultInfo");

  list.innerHTML = `<div class="empty">Memuat jurusan...</div>`;

  const { data, error } = await supabaseClient
    .from("jurusan")
    .select("id, nama, jenjang, fakultas, akreditasi")
    .order("nama", { ascending: true });

  if (error) {
    console.error("Gagal memuat jurusan:", error);
    list.innerHTML = `<div class="empty">Gagal memuat jurusan.</div>`;
    return;
  }

  jurusanData = data || [];
  renderJurusan(jurusanData);
}

function renderJurusan(data) {
  const list = document.getElementById("jurusanList");
  const info = document.getElementById("jurusanResultInfo");

  info.textContent = `Menampilkan ${data.length} jurusan`;

  list.innerHTML = data.length
    ? data.map(item => `
      <article class="item-card">
        <div class="card-meta">
          <span class="pill">${item.jenjang || "Jenjang"}</span>
          <span class="pill">${item.akreditasi || "Akreditasi belum tersedia"}</span>
        </div>
        <h3>${item.nama}</h3>
        <p>${item.fakultas || "Fakultas belum tersedia"}</p>
        <a href="jurusan-detail.html?id=${item.id}" class="btn ghost">Lihat Detail</a>
      </article>
    `).join("")
    : `<div class="empty">Jurusan tidak ditemukan.</div>`;
}

loadJurusan();