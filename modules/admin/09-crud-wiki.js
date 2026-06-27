/* =========================
   CRUD WIKI
========================= */

if (qs("wikiForm")) {
  qs("wikiForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("wikiId").value;
    const imageFile = qs("wikiImage")?.files[0];
    const imageUrl = await uploadImage(imageFile);

    const payload = {
      judul: qs("wikiTitle").value,
      kategori: "",
      isi: getEditorHTML("wiki")
    };

    if (imageUrl) payload.gambar = imageUrl;

    let response;

    if (id) {
      response = await supabaseClient
        .from("wiki_kampus")
        .update(payload)
        .eq("id", id);
    } else {
      response = await supabaseClient
        .from("wiki_kampus")
        .insert(payload)
        .select()
        .single();
    }

    if (response.error) {
      alert("Gagal menyimpan wiki: " + response.error.message);
      return;
    }

    const savedId = id ? Number(id) : response.data.id;

    await saveRelations(
      "wiki",
      savedId,
      getSelectedValues("wikiKategoriMulti"),
      getSelectedValues("wikiTagMulti"),
      []
    );

    clearForm("wiki");
    await loadWikiData();
    resetDashboardAudit();
    localStorage.removeItem("draft_wiki");
  });
}

