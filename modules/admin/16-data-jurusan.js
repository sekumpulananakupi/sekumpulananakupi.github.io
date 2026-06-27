/* =========================
   DATA JURUSAN
========================= */

async function loadJurusanAdminData() {
  const { data } = await supabaseClient
    .from("jurusan")
    .select("id, nama, slug, fakultas, jenjang, akreditasi, website_resmi, url_kurikulum, url_akreditasi, prospek_kerja, deskripsi")
    .order("nama", { ascending: true });

  jurusanAdminData = data || [];
  renderJurusanAdminList();
}

function renderJurusanAdminList() {
  const list = qs("jurusanAdminList");
  if (!list) return;

  list.innerHTML = jurusanAdminData.length
    ? jurusanAdminData.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.fakultas || "-"}</span>
          <h3>${item.nama}</h3>
          <p>
            Jenjang: ${item.jenjang || "-"} · 
            Akreditasi: ${item.akreditasi || "-"} · 
          </p>
          <p>${stripHTML(item.deskripsi || "").slice(0, 80)}...</p>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editJurusan(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteJurusan(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada data jurusan.</div>`;
}

if (qs("jurusanForm")) {
  qs("jurusanForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("jurusanId").value;

    const payload = {
      nama: qs("jurusanNama").value,
      slug: qs("jurusanSlug").value,
      fakultas: qs("jurusanFakultas").value,
      jenjang: qs("jurusanJenjang").value,
      akreditasi: qs("jurusanAkreditasi").value,
      website_resmi: qs("jurusanWebsite").value,
      url_kurikulum: qs("jurusanUrlKurikulum").value,
      url_akreditasi: qs("jurusanUrlAkreditasi").value,
      prospek_kerja: qs("jurusanProspekKerja").value,
      deskripsi: qs("jurusanDeskripsi").value
    };

    const response = id
      ? await supabaseClient.from("jurusan").update(payload).eq("id", id)
      : await supabaseClient.from("jurusan").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan jurusan: " + response.error.message);
      return;
    }

    clearJurusanForm();
    await loadJurusanAdminData();
    clearMasterDataCache();
    resetDashboardAudit();
    await loadMasterData();
  });
}

function editJurusan(id) {
  const item = jurusanAdminData.find(row => row.id === id);
  if (!item) return;

  qs("jurusanId").value = item.id;
  qs("jurusanNama").value = item.nama || "";
  qs("jurusanSlug").value = item.slug || "";
  qs("jurusanFakultas").value = item.fakultas || "";
  qs("jurusanJenjang").value = item.jenjang || "";
  qs("jurusanDeskripsi").value = item.deskripsi || "";
  qs("jurusanAkreditasi").value = item.akreditasi || "";
  qs("jurusanWebsite").value = item.website_resmi || "";
  qs("jurusanUrlKurikulum").value = item.url_kurikulum || "";
  qs("jurusanUrlAkreditasi").value = item.url_akreditasi || "";
  qs("jurusanProspekKerja").value = item.prospek_kerja || "";

  showAdminPage("jurusanPage");
}

async function deleteJurusan(id) {
  if (!confirm("Yakin ingin menghapus jurusan ini?")) return;

  const { error } = await supabaseClient
    .from("jurusan")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus jurusan: " + error.message);
    return;
  }

  await loadJurusanAdminData();
  clearMasterDataCache();
    resetDashboardAudit();
    await loadMasterData();
}

function clearJurusanForm() {
  qs("jurusanForm")?.reset();
  if (qs("jurusanId")) qs("jurusanId").value = "";
}

