/* =========================
   CRUD BIAYA PENDIDIKAN
========================= */

function normalizeJalurValue(jalur) {
  const map = {
    snbp_snbt: "SNBP/SNBT",
    mandiri: "Mandiri",
    internasional: "Kelas Internasional",
    rpl: "RPL",
    reguler: "Reguler",
    dbr: "Doktor by Research",
    profesi: "Profesi"
  };

  return map[jalur] || jalur || "-";
}

function getBiayaAmountLabels(item) {
  const parts = [];

  if (item.ukt !== null && item.ukt !== undefined && item.ukt !== "") {
    parts.push(`UKT: <strong>${formatRupiah(item.ukt)}</strong>`);
  }

  if (item.ipi !== null && item.ipi !== undefined && item.ipi !== "") {
    parts.push(`IPI: <strong>${formatRupiah(item.ipi)}</strong>`);
  }

  if (item.uang_kuliah !== null && item.uang_kuliah !== undefined && item.uang_kuliah !== "") {
    parts.push(`Uang kuliah: <strong>${formatRupiah(item.uang_kuliah)}</strong>`);
  }

  return parts.length ? parts.join(" · ") : "Belum ada nominal";
}

async function loadBiayaPendidikanAdminData({ append = false } = {}) {
  const from = append ? adminBiayaPage * ADMIN_PAGE_SIZE : 0;
  const to = from + ADMIN_PAGE_SIZE - 1;

  const { data, error } = await supabaseClient
    .from("biaya_pendidikan")
    .select("id, kode_prodi, nama_prodi, tahun, jenjang, jalur, kelompok, status_mahasiswa, ukt, ipi, uang_kuliah, catatan")
    .order("tahun", { ascending: false })
    .order("jenjang", { ascending: true })
    .order("jalur", { ascending: true })
    .order("nama_prodi", { ascending: true })
    .order("kelompok", { ascending: true })
    .range(from, to);

  if (error) {
    alert("Gagal memuat biaya pendidikan: " + error.message);
    if (!append) biayaPendidikanData = [];
    return;
  }

  const rows = data || [];

  biayaPendidikanData = append
    ? mergeAdminRowsById(biayaPendidikanData, rows)
    : rows;

  adminBiayaHasMore = rows.length === ADMIN_PAGE_SIZE;

  if (!append) {
    adminBiayaPage = 1;
    resetAdminListPagination("biaya");
  } else {
    adminBiayaPage += 1;
    adminListVisibleCount.biaya = biayaPendidikanData.length;
  }

  renderBiayaPendidikanAdminList();
}

function renderBiayaPendidikanAdminList() {
  const list = qs("biayaPendidikanAdminList");
  if (!list) return;

  const keyword = qs("biayaPendidikanSearch")?.value.toLowerCase().trim() || "";

  const filtered = biayaPendidikanData.filter(item => {
    const searchText = `
      ${item.kode_prodi || ""}
      ${item.nama_prodi || ""}
      ${item.tahun || ""}
      ${item.jenjang || ""}
      ${item.jalur || ""}
      ${item.kelompok || ""}
      ${item.status_mahasiswa || ""}
      ${item.catatan || ""}
    `.toLowerCase();

    return !keyword || searchText.includes(keyword);
  });

  const visibleItems = filtered.slice(0, adminListVisibleCount.biaya);

  const loadMoreButton = adminBiayaHasMore
    ? `
      <div class="admin-load-more">
        <button class="btn ghost" type="button" onclick="loadMoreAdminBiaya()">
          Muat Lagi Biaya Pendidikan
        </button>
      </div>
    `
    : renderAdminLoadMore("biaya", filtered.length, "renderBiayaPendidikanAdminList");

  list.innerHTML = visibleItems.length
    ? visibleItems.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.tahun || "-"}</span>
          <h3>${item.nama_prodi || "Program studi belum diisi"}</h3>
          <p>
            ${item.kode_prodi || "-"} ·
            ${item.jenjang || "-"} ·
            ${normalizeJalurValue(item.jalur)}
            ${item.kelompok ? ` · Kelompok ${item.kelompok}` : ""}
            ${item.status_mahasiswa ? ` · ${item.status_mahasiswa}` : ""}
          </p>
          <p>${getBiayaAmountLabels(item)}</p>
          ${item.catatan ? `<p>${item.catatan}</p>` : ""}
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editBiayaPendidikan(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteBiayaPendidikan(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("") + loadMoreButton
    : `<div class="empty">Belum ada data biaya pendidikan.</div>`;
}

function populateBiayaJurusanOptions() {
  const datalist = qs("biayaNamaProdiList");
  if (!datalist) return;

  datalist.innerHTML = jurusanAdminData.map(jurusan => `
    <option value="${jurusan.nama || ""}"></option>
  `).join("");
}

function getOptionalNumber(id) {
  const value = qs(id)?.value;
  return value === "" || value === null || value === undefined ? null : Number(value);
}

function getOptionalText(id) {
  const value = qs(id)?.value?.trim();
  return value ? value : null;
}

if (qs("biayaPendidikanForm")) {
  qs("biayaPendidikanForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("biayaId").value;

    const payload = {
      kode_prodi: qs("biayaKodeProdi").value.trim(),
      nama_prodi: qs("biayaNamaProdi").value.trim(),
      tahun: Number(qs("biayaTahun").value),
      jenjang: qs("biayaJenjang").value,
      jalur: qs("biayaJalur").value,
      kelompok: getOptionalNumber("biayaKelompok"),
      status_mahasiswa: getOptionalText("biayaStatusMahasiswa"),
      ukt: getOptionalNumber("biayaUkt"),
      ipi: getOptionalNumber("biayaIpi"),
      uang_kuliah: getOptionalNumber("biayaUangKuliah"),
      catatan: getOptionalText("biayaCatatan")
    };

    if (!payload.ukt && !payload.ipi && !payload.uang_kuliah) {
      alert("Isi minimal salah satu nominal: UKT, IPI, atau Uang Kuliah.");
      return;
    }

    const response = id
      ? await supabaseClient.from("biaya_pendidikan").update(payload).eq("id", id)
      : await supabaseClient.from("biaya_pendidikan").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan biaya pendidikan: " + response.error.message);
      return;
    }

    clearBiayaPendidikanForm();
    await loadBiayaPendidikanAdminData();
  });
}

function editBiayaPendidikan(id) {
  const item = biayaPendidikanData.find(row => row.id === id);
  if (!item) return;

  qs("biayaId").value = item.id;
  qs("biayaKodeProdi").value = item.kode_prodi || "";
  qs("biayaNamaProdi").value = item.nama_prodi || "";
  qs("biayaTahun").value = item.tahun || 2026;
  qs("biayaJenjang").value = item.jenjang || "";
  qs("biayaJalur").value = item.jalur || "";
  qs("biayaKelompok").value = item.kelompok || "";
  qs("biayaStatusMahasiswa").value = item.status_mahasiswa || "";
  qs("biayaUkt").value = item.ukt ?? "";
  qs("biayaIpi").value = item.ipi ?? "";
  qs("biayaUangKuliah").value = item.uang_kuliah ?? "";
  qs("biayaCatatan").value = item.catatan || "";

  updateBiayaPreview();

  showAdminPage("biayaPendidikanPage");
}

async function deleteBiayaPendidikan(id) {
  if (!confirm("Yakin ingin menghapus data biaya pendidikan ini?")) return;

  const { error } = await supabaseClient
    .from("biaya_pendidikan")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus biaya pendidikan: " + error.message);
    return;
  }

  await loadBiayaPendidikanAdminData();
}

function clearBiayaPendidikanForm() {
  qs("biayaPendidikanForm")?.reset();

  if (qs("biayaId")) qs("biayaId").value = "";
  if (qs("biayaTahun")) qs("biayaTahun").value = 2026;

  updateBiayaPreview();
}

function updateBiayaPreview() {
  const preview = qs("biayaPreview");
  if (!preview) return;

  const ukt = getOptionalNumber("biayaUkt");
  const ipi = getOptionalNumber("biayaIpi");
  const uangKuliah = getOptionalNumber("biayaUangKuliah");

  const parts = [];
  if (ukt) parts.push(`UKT ${formatRupiah(ukt)}`);
  if (ipi) parts.push(`IPI ${formatRupiah(ipi)}`);
  if (uangKuliah) parts.push(`Uang Kuliah ${formatRupiah(uangKuliah)}`);

  preview.textContent = parts.length ? parts.join(" · ") : "Rp0";
}

["biayaUkt", "biayaIpi", "biayaUangKuliah"].forEach(id => {
  const input = qs(id);
  if (input) input.addEventListener("input", updateBiayaPreview);
});

if (qs("biayaPendidikanSearch")) {
  qs("biayaPendidikanSearch").addEventListener("input", renderBiayaPendidikanAdminList);
}

