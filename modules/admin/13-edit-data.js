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
  const item = wikiData.find(row => row.id === id);
  if (!item) return;

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
  const item = jobData.find(row => row.id === id);
  if (!item) return;

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

