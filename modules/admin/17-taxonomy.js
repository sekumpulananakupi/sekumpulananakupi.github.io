/* =========================
   KATEGORI & TAG
========================= */

async function loadTaxonomyAdminData() {
  const { data: kategori } = await supabaseClient
    .from("kategori")
    .select("id, nama, slug, tipe")
    .order("nama", { ascending: true });

  const { data: tags } = await supabaseClient
    .from("tags")
    .select("id, nama, slug")
    .order("nama", { ascending: true });

  kategoriAdminData = kategori || [];
  tagAdminData = tags || [];

  renderKategoriAdminList();
  renderTagAdminList();
}

function renderKategoriAdminList() {
  const list = qs("kategoriAdminList");
  if (!list) return;

  list.innerHTML = kategoriAdminData.length
    ? kategoriAdminData.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">${item.tipe || "info"}</span>
          <h3>${item.nama}</h3>
          <p>Slug: ${item.slug}</p>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editKategori(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteKategori(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada kategori.</div>`;
}

function renderTagAdminList() {
  const list = qs("tagAdminList");
  if (!list) return;

  list.innerHTML = tagAdminData.length
    ? tagAdminData.map(item => `
      <article class="admin-list-item">
        <div>
          <span class="pill">tag</span>
          <h3>${item.nama}</h3>
          <p>Slug: ${item.slug}</p>
        </div>

        <div class="card-actions">
          <button class="btn ghost" onclick="editTag(${item.id})">Edit</button>
          <button class="btn danger" onclick="deleteTag(${item.id})">Hapus</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Belum ada tag.</div>`;
}

if (qs("kategoriForm")) {
  qs("kategoriForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("kategoriId").value;

    const payload = {
      nama: qs("kategoriNama").value,
      slug: qs("kategoriSlug").value,
      tipe: qs("kategoriTipe").value
    };

    const response = id
      ? await supabaseClient.from("kategori").update(payload).eq("id", id)
      : await supabaseClient.from("kategori").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan kategori: " + response.error.message);
      return;
    }

    clearKategoriForm();
    await loadTaxonomyAdminData();
    clearMasterDataCache();
    await loadMasterData();
  });
}

if (qs("tagForm")) {
  qs("tagForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("tagId").value;

    const payload = {
      nama: qs("tagNama").value,
      slug: qs("tagSlug").value
    };

    const response = id
      ? await supabaseClient.from("tags").update(payload).eq("id", id)
      : await supabaseClient.from("tags").insert(payload);

    if (response.error) {
      alert("Gagal menyimpan tag: " + response.error.message);
      return;
    }

    clearTagForm();
    await loadTaxonomyAdminData();
    clearMasterDataCache();
    await loadMasterData();
  });
}

function editKategori(id) {
  const item = kategoriAdminData.find(row => row.id === id);
  if (!item) return;

  qs("kategoriId").value = item.id;
  qs("kategoriNama").value = item.nama;
  qs("kategoriSlug").value = item.slug;
  qs("kategoriTipe").value = item.tipe || "info";

  showAdminPage("taxonomyPage");
}

async function deleteKategori(id) {
  if (!confirm("Yakin ingin menghapus kategori ini?")) return;

  const { error } = await supabaseClient
    .from("kategori")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus kategori: " + error.message);
    return;
  }

  await loadTaxonomyAdminData();
  clearMasterDataCache();
    await loadMasterData();
}

function clearKategoriForm() {
  qs("kategoriForm")?.reset();
  if (qs("kategoriId")) qs("kategoriId").value = "";
}

function editTag(id) {
  const item = tagAdminData.find(row => row.id === id);
  if (!item) return;

  qs("tagId").value = item.id;
  qs("tagNama").value = item.nama;
  qs("tagSlug").value = item.slug;

  showAdminPage("taxonomyPage");
}

async function deleteTag(id) {
  if (!confirm("Yakin ingin menghapus tag ini?")) return;

  const { error } = await supabaseClient
    .from("tags")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Gagal menghapus tag: " + error.message);
    return;
  }

  await loadTaxonomyAdminData();
  clearMasterDataCache();
    await loadMasterData();
}

function clearTagForm() {
  qs("tagForm")?.reset();
  if (qs("tagId")) qs("tagId").value = "";
}

