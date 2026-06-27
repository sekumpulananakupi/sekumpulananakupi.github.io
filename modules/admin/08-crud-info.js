/* =========================
   CRUD INFO
========================= */

if (qs("infoForm")) {
  qs("infoForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("infoId").value;
    const imageFile = qs("infoImage")?.files[0];
    const imageUrl = await uploadImage(imageFile);

    const payload = {
      judul: qs("infoTitle").value,
      kategori: "",
      isi: getEditorHTML("info")
    };

    if (imageUrl) payload.gambar = imageUrl;

    let response;

    if (id) {
      response = await supabaseClient
        .from("informasi_kampus")
        .update(payload)
        .eq("id", id);
    } else {
      response = await supabaseClient
        .from("informasi_kampus")
        .insert(payload)
        .select()
        .single();
    }

    if (response.error) {
      alert("Gagal menyimpan info kampus: " + response.error.message);
      return;
    }

    const savedId = id ? Number(id) : response.data.id;

    await saveRelations(
      "info",
      savedId,
      getSelectedValues("infoKategoriMulti"),
      [],
      []
    );

    clearForm("info");
    await loadInfoData();
    resetDashboardAudit();
    localStorage.removeItem("draft_info");
  });
}

