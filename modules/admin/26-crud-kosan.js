let kosanAdminData = [];

function kosanEscape(value) {
  return String(value || "").replace(/[&<>"']/g, character => {
    const codes = { "&": 38, "<": 60, ">": 62, "\"": 34, "'": 39 };
    return String.fromCharCode(38, 35) + codes[character] + String.fromCharCode(59);
  });
}

async function loadKosanAdminData() {
  const { data, error } = await supabaseClient
    .from("kosan")
    .select("id,nama,tipe,area,alamat,harga_bulanan,fasilitas,deskripsi,gambar,kontak,tersedia,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Gagal memuat kosan:", error.message);
    kosanAdminData = [];
  } else {
    kosanAdminData = data || [];
  }
  renderKosanAdminList();
}

function renderKosanAdminList() {
  const list = qs("kosanAdminList");
  if (!list) return;
  list.innerHTML = kosanAdminData.length ? kosanAdminData.map(item => `
    <article class="admin-list-item">
      <div><span class="pill">${kosanEscape(item.tipe || "Kosan")}</span><h3>${kosanEscape(item.nama)}</h3><p>${kosanEscape(item.area || item.alamat || "Area belum diisi")} · Rp${Number(item.harga_bulanan || 0).toLocaleString("id-ID")}/bulan · ${item.tersedia ? "Tersedia" : "Penuh"}</p></div>
      <div class="card-actions"><button class="btn ghost" type="button" onclick="editKosan(${item.id})">Edit</button><button class="btn danger" type="button" onclick="deleteKosan(${item.id})">Hapus</button></div>
    </article>`).join("") : '<div class="empty">Belum ada data kosan.</div>';
}

if (qs("kosanForm")) {
  qs("kosanForm").addEventListener("submit", async event => {
    event.preventDefault();
    const id = qs("kosanId").value;
    const payload = {
      nama: qs("kosanNama").value.trim(), tipe: qs("kosanTipe").value, area: qs("kosanArea").value.trim(), alamat: qs("kosanAlamat").value.trim(),
      harga_bulanan: Number(qs("kosanHarga").value), fasilitas: qs("kosanFasilitas").value.trim(), deskripsi: qs("kosanDeskripsi").value.trim(),
      gambar: qs("kosanGambar").value.trim(), kontak: qs("kosanKontak").value.trim(), tersedia: qs("kosanTersedia").checked
    };
    const response = id ? await supabaseClient.from("kosan").update(payload).eq("id", id) : await supabaseClient.from("kosan").insert(payload);
    if (response.error) { alert("Gagal menyimpan kosan: " + response.error.message); return; }
    clearKosanForm();
    await loadKosanAdminData();
  });
}

function editKosan(id) {
  const item = kosanAdminData.find(row => String(row.id) === String(id));
  if (!item) return;
  qs("kosanId").value = item.id;
  qs("kosanNama").value = item.nama || ""; qs("kosanTipe").value = item.tipe || "Putra"; qs("kosanArea").value = item.area || "";
  qs("kosanAlamat").value = item.alamat || ""; qs("kosanHarga").value = item.harga_bulanan || ""; qs("kosanFasilitas").value = item.fasilitas || "";
  qs("kosanDeskripsi").value = item.deskripsi || ""; qs("kosanGambar").value = item.gambar || ""; qs("kosanKontak").value = item.kontak || ""; qs("kosanTersedia").checked = Boolean(item.tersedia);
  window.activateAdminPage?.("kosanPage");
}

async function deleteKosan(id) {
  if (!confirm("Yakin ingin menghapus data kosan ini?")) return;
  const { error } = await supabaseClient.from("kosan").delete().eq("id", id);
  if (error) { alert("Gagal menghapus kosan: " + error.message); return; }
  await loadKosanAdminData();
}

function clearKosanForm() {
  qs("kosanForm")?.reset();
  qs("kosanId").value = "";
  qs("kosanTersedia").checked = true;
}
