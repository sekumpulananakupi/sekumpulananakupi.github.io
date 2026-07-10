const SUPABASE_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let kosanData = [];

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, character => {
    const codes = { "&": 38, "<": 60, ">": 62, "\"": 34, "'": 39 };
    return String.fromCharCode(38, 35) + codes[character] + String.fromCharCode(59);
  });
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function getWhatsAppLink(number, name) {
  const phone = String(number || "").replace(/\D/g, "").replace(/^0/, "62");
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(`Halo, saya ingin menanyakan kosan ${name || ""}.`)}`;
}

function renderAreas() {
  const select = document.getElementById("kosanAreaFilter");
  if (!select) return;
  const current = select.value;
  const areas = [...new Set(kosanData.map(item => item.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id"));
  select.innerHTML = '<option value="">Semua area</option>' + areas.map(area => `<option value="${escapeHTML(area)}">${escapeHTML(area)}</option>`).join("");
  select.value = current;
}

function renderKosan() {
  const list = document.getElementById("kosanList");
  const search = document.getElementById("kosanSearch")?.value.trim().toLowerCase() || "";
  const tipe = document.getElementById("kosanTipeFilter")?.value || "";
  const area = document.getElementById("kosanAreaFilter")?.value || "";
  const maxHarga = Number(document.getElementById("kosanHargaFilter")?.value) || 0;
  const items = kosanData.filter(item => {
    const haystack = [item.nama, item.area, item.alamat, item.fasilitas, item.deskripsi].join(" ").toLowerCase();
    return (!search || haystack.includes(search)) && (!tipe || item.tipe === tipe) && (!area || item.area === area) && (!maxHarga || Number(item.harga_bulanan) <= maxHarga);
  });

  document.getElementById("kosanTotal").textContent = kosanData.length.toLocaleString("id-ID");
  document.getElementById("kosanResultCount").textContent = `${items.length} kosan ditemukan`;
  if (!list) return;
  if (!items.length) {
    list.innerHTML = '<div class="kosan-empty"><i class="fa-solid fa-house-circle-xmark"></i><h3>Kosan belum ditemukan</h3><p>Coba ubah kata kunci atau filter pencarian.</p></div>';
    return;
  }

  list.innerHTML = items.map(item => {
    const whatsapp = getWhatsAppLink(item.kontak, item.nama);
    const facilities = String(item.fasilitas || "").split(",").map(value => value.trim()).filter(Boolean);
    return `<article class="kosan-card">
      <div class="kosan-card-image">${item.gambar ? `<img src="${escapeHTML(item.gambar)}" alt="${escapeHTML(item.nama)}" loading="lazy">` : '<i class="fa-solid fa-house"></i>'}</div>
      <div class="kosan-card-body">
        <div class="kosan-card-top"><span class="kosan-type">${escapeHTML(item.tipe || "Kosan")}</span>${item.tersedia ? '<span class="kosan-available">Tersedia</span>' : '<span class="kosan-full">Penuh</span>'}</div>
        <h3>${escapeHTML(item.nama || "Kosan Mahasiswa")}</h3>
        <p class="kosan-location"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(item.area || item.alamat || "Sekitar UPI")}</p>
        <p class="kosan-description">${escapeHTML(item.deskripsi || "Hubungi pemilik untuk informasi lebih lanjut.")}</p>
        ${facilities.length ? `<div class="kosan-facilities">${facilities.slice(0, 4).map(value => `<span>${escapeHTML(value)}</span>`).join("")}</div>` : ""}
        <div class="kosan-card-footer"><strong>${formatRupiah(item.harga_bulanan)}<small>/bulan</small></strong>${whatsapp ? `<a class="btn primary" href="${whatsapp}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Hubungi</a>` : ""}</div>
      </div>
    </article>`;
  }).join("");
}

async function loadKosan() {
  const list = document.getElementById("kosanList");
  if (list) list.innerHTML = '<p class="kosan-loading">Memuat daftar kosan...</p>';
  const { data, error } = await supabaseClient.from("kosan").select("id,nama,tipe,area,alamat,harga_bulanan,fasilitas,deskripsi,gambar,kontak,tersedia,created_at").order("created_at", { ascending: false });
  if (error) {
    console.error("Gagal memuat kosan:", error.message);
    if (list) list.innerHTML = '<div class="kosan-empty"><h3>Daftar kosan belum dapat dimuat</h3><p>Silakan coba lagi nanti.</p></div>';
    return;
  }
  kosanData = data || [];
  renderAreas();
  renderKosan();
}

document.addEventListener("DOMContentLoaded", () => {
  ["kosanSearch", "kosanTipeFilter", "kosanAreaFilter", "kosanHargaFilter"].forEach(id => document.getElementById(id)?.addEventListener(id === "kosanSearch" ? "input" : "change", renderKosan));
  loadKosan();
});
