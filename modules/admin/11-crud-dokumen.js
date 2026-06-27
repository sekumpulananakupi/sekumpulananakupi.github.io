/* =========================
   CRUD DOKUMEN
========================= */

async function loadDokumenData() {
  const { data } = await supabaseClient
    .from("dokumen_kampus")
    .select("id, judul, kategori, deskripsi, link, created_at")
    .order("created_at", { ascending: false });

  dokumenData = data || [];
  resetAdminListPagination("dokumen");
  renderDokumenList();
  updateDashboardStats();
}

function renderDokumenList() {
  const list = qs("dokumenList");
  if (!list) return;

  const visibleItems = dokumenData.slice(0, adminListVisibleCount.dokumen);

  list.innerHTML = visibleItems.length
    ? visibleItems.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.kategori || "Dokumen"}</span>
          <h3>${item.judul}</h3>
          <p>${item.deskripsi || ""}</p>
        </div>

        <div class="card-actions">
          <a href="${item.link}" target="_blank" class="btn ghost">Buka</a>
          <button class="btn ghost" onclick="editDokumen(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteDokumen(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("") + renderAdminLoadMore("dokumen", dokumenData.length, "renderDokumenList")
    : `<div class="empty">Belum ada dokumen.</div>`;
}

if (qs("dokumenForm")) {
  qs("dokumenForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("dokumenId").value;

    const payload = {
      judul: qs("dokumenJudul").value,
      kategori: qs("dokumenKategori").value,
      deskripsi: qs("dokumenDeskripsi").value,
      link: qs("dokumenLink").value
    };

    const response = id
      ? await supabaseClient.from("dokumen_kampus").update(payload).eq("id", id)
      : await supabaseClient.from("dokumen_kampus").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan dokumen: " + response.error.message);
      return;
    }

    clearDokumenForm();
    await loadDokumenData();
    resetDashboardAudit();
  });
}

function editDokumen(id) {
  const item = dokumenData.find(row => row.id === id);
  if (!item) return;

  qs("dokumenId").value = item.id;
  qs("dokumenJudul").value = item.judul || "";
  qs("dokumenKategori").value = item.kategori || "";
  qs("dokumenDeskripsi").value = item.deskripsi || "";
  qs("dokumenLink").value = item.link || "";

  showAdminPage("dokumenPage");
}

async function deleteDokumen(id) {
  if (!confirm("Yakin ingin menghapus dokumen ini?")) return;

  const { error } = await supabaseClient
    .from("dokumen_kampus")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus dokumen: " + error.message);
    return;
  }

  await loadDokumenData();
    resetDashboardAudit();
}

function clearDokumenForm() {
  qs("dokumenForm")?.reset();
  if (qs("dokumenId")) qs("dokumenId").value = "";
}

