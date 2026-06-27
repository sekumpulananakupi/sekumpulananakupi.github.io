/* =========================
   EDIT DATA
========================= */

async function editInfo(id) {
  const item = infoData.find(row => row.id === id);
  if (!item) return;

  qs("infoId").value = item.id;
  qs("infoTitle").value = item.judul || "";
  setEditorHTML("info", item.isi || "");

  await setSelectedRelations(
    "info",
    id,
    "infoKategoriMulti",
    "",
    ""
  );

  showAdminPage("infoPage");
}

async function editWiki(id) {
  let item = wikiData.find(row => Number(row.id) === Number(id));

  const { data, error } = await supabaseClient
    .from("wiki_kampus")
    .select("id, judul, isi")
    .eq("id", id)
    .single();

  if (error || !data) {
    alert("Gagal memuat detail wiki.");
    return;
  }

  item = { ...item, ...data };

  qs("wikiId").value = item.id;
  qs("wikiTitle").value = item.judul || "";
  setEditorHTML("wiki", item.isi || "");

  await setSelectedRelations(
    "wiki",
    id,
    "wikiKategoriMulti",
    "wikiTagMulti",
    ""
  );

  showAdminPage("wikiPage");
}

async function editJob(id) {
  let item = jobData.find(row => Number(row.id) === Number(id));

  const { data, error } = await supabaseClient
    .from("lowongan_kerja")
    .select(`
      id,
      posisi,
      perusahaan,
      lokasi,
      link,
      deadline,
      status,
      tipe_pekerjaan,
      jenjang_pendidikan,
      is_featured,
      sumber,
      gaji_min,
      gaji_max,
      gaji_keterangan,
      deskripsi
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    alert("Gagal memuat detail lowongan.");
    return;
  }

  item = { ...item, ...data };

  qs("jobId").value = item.id;
  qs("jobTitle").value = item.posisi || "";
  qs("jobCompany").value = item.perusahaan || "";
  qs("jobLocation").value = item.lokasi || "";
  qs("jobLink").value = item.link || "";
  qs("jobDeadline").value = item.deadline || "";
  qs("jobStatus").value = item.status || "aktif";
  qs("jobType").value = item.tipe_pekerjaan || "";
  qs("jobEducation").value = item.jenjang_pendidikan || "";
  qs("jobFeatured").checked = !!item.is_featured;
  qs("jobSource").value = item.sumber || "";
  qs("jobSalaryMin").value = item.gaji_min || "";
  qs("jobSalaryMax").value = item.gaji_max || "";
  qs("jobSalaryNote").value = item.gaji_keterangan || "";
  setEditorHTML("job", item.deskripsi || "");

  await setSelectedRelations(
    "job",
    id,
    "",
    "",
    "jobJurusanMulti"
  );

  showAdminPage("jobPage");
}

