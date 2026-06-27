/* =========================
   CRUD LOWONGAN
========================= */

if (qs("jobForm")) {
  qs("jobForm").addEventListener("submit", async event => {
    event.preventDefault();

    const id = qs("jobId").value;
    const imageFile = qs("jobImage")?.files[0];
    const imageUrl = await uploadImage(imageFile);

   const payload = {
     posisi: qs("jobTitle").value,
     perusahaan: qs("jobCompany").value,
     lokasi: qs("jobLocation").value,
     link: qs("jobLink").value,
     deadline: qs("jobDeadline").value || null,
     status: qs("jobStatus").value || "aktif",
     tipe_pekerjaan: qs("jobType").value || null,
     jenjang_pendidikan: qs("jobEducation").value || null,
     is_featured: qs("jobFeatured").checked,
     sumber: qs("jobSource").value || null,
     gaji_min: qs("jobSalaryMin").value ? Number(qs("jobSalaryMin").value) : null,
     gaji_max: qs("jobSalaryMax").value ? Number(qs("jobSalaryMax").value) : null,
     gaji_keterangan: qs("jobSalaryNote").value || null,
     deskripsi: getEditorHTML("job")
   };

    if (imageUrl) payload.gambar = imageUrl;

    let response;

    if (id) {
      response = await supabaseClient
        .from("lowongan_kerja")
        .update(payload)
        .eq("id", id);
    } else {
      response = await supabaseClient
        .from("lowongan_kerja")
        .insert(payload)
        .select()
        .single();
    }

    if (response.error) {
      alert("Gagal menyimpan lowongan: " + response.error.message);
      return;
    }

    const savedId = id ? Number(id) : response.data.id;

    await saveRelations(
  "job",
  savedId,
  [],
  [],
  getSelectedValues("jobJurusanMulti")
);

    clearForm("job");
    await loadJobData();
    resetDashboardAudit();
    localStorage.removeItem("draft_job");
  });
}

