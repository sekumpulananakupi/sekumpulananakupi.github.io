/* =========================
   DELETE CONTENT
========================= */

async function deleteItem(type, id) {
  if (!confirm("Yakin ingin menghapus data ini?")) return;

  await supabaseClient
    .from("artikel_kategori")
    .delete()
    .eq("artikel_tipe", type)
    .eq("artikel_id", id);

  await supabaseClient
    .from("artikel_tags")
    .delete()
    .eq("artikel_tipe", type)
    .eq("artikel_id", id);

  await supabaseClient
    .from("artikel_jurusan")
    .delete()
    .eq("artikel_tipe", type)
    .eq("artikel_id", id);

  let response;

  if (type === "info") {
    response = await supabaseClient
      .from("informasi_kampus")
      .delete()
      .eq("id", id);
  }

  if (type === "wiki") {
    response = await supabaseClient
      .from("wiki_kampus")
      .delete()
      .eq("id", id);
  }

  if (type === "job") {
    response = await supabaseClient
      .from("lowongan_kerja")
      .delete()
      .eq("id", id);
  }

  if (response?.error) {
    alert("Gagal menghapus data: " + response.error.message);
    return;
  }

  if (type === "info") await loadInfoData();
  if (type === "wiki") await loadWikiData();
  if (type === "job") await loadJobData();
  resetDashboardAudit();
}

/* =========================
   CLEAR FORM
========================= */

function clearForm(type) {
  const form = qs(`${type}Form`);
  const idInput = qs(`${type}Id`);

  if (form) form.reset();
  if (idInput) idInput.value = "";

  clearEditor(type);

  const relationIds = {
    info: ["infoKategoriMulti"],
    wiki: ["wikiKategoriMulti", "wikiTagMulti"],
    job: ["jobJurusanMulti"],
  };

  (relationIds[type] || []).forEach(containerId => {
    const container = qs(containerId);
    if (!container) return;

    container.querySelectorAll("input[type='checkbox']").forEach(input => {
      input.checked = false;
    });
  });
}

